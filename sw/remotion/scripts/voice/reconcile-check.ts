/**
 * reconcile-check.ts — 음성 파이프라인 reconcile 단계 검증
 *
 * 3-timings.ts가 기록한 voiceTimings에서 LLM 보정이 필요한 세그먼트를 진단한다.
 * 두 가지 이상 징후를 찾는다:
 *
 *  (A) Whisper text 오인식 — seg.text가 원고(display_text) slice와 크게 다름
 *      예: "식영" vs "시경", "가보년" vs "갑오년"
 *  (B) Duration 압축 — seg.end-seg.start가 음절 수 대비 비상식적으로 짧음
 *      예: "1576년" (7음절 상당) 140ms — 한국어 TTS 평균 ~150ms/음절 기준
 *
 * 이 스크립트는 **보정을 수행하지 않는다**. 진단만 내보낸다.
 * 실제 보정은 `/voice-reconcile <에피소드명>` 스킬(LLM 대화)이 수행한다.
 *
 * Usage:
 *   pnpm reconcile:check -- --episode <name>
 *   pnpm reconcile:check -- --episode <name> --json    # JSON 출력(스킬이 파싱)
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { findEpisodeDir, parseEpName, resolveTimingPath } from '../lib/episode.js'

const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null
const jsonMode = args.includes('--json')

if (!epName) {
  console.error('Usage: pnpm reconcile:check -- --episode <name> [--json]')
  process.exit(1)
}

// --- 에피소드 로드 ---
const { person, locale } = parseEpName(epName)
const episodeDir = findEpisodeDir(person)
const epPath = join(episodeDir, `${locale}.json`)
const episode = JSON.parse(readFileSync(epPath, 'utf-8'))
const timingPath = resolveTimingPath(epName)
const timing = JSON.parse(readFileSync(timingPath, 'utf-8'))
const voiceTimings: Record<string, any[]> = timing.voiceTimings ?? {}

// 쇼츠 외부 파일 로드 — shorts-N 키 매칭용
const shortsDir = join(episodeDir, 'shorts')
const shortsBySegKey = new Map<string, string>() // key → original seg.text
if (existsSync(shortsDir)) {
  const files = readdirSync(shortsDir)
  const contentRe = new RegExp(`^${locale}-(\\d+)\\.json$`)
  for (const f of files) {
    if (f.endsWith('.timing.json')) continue
    const m = f.match(contentRe)
    if (!m) continue
    const idx1 = parseInt(m[1])
    const content = JSON.parse(readFileSync(join(shortsDir, f), 'utf-8'))
    let si = 0
    for (const seg of content.segments ?? []) {
      if (seg.id === 'cta') { si++; continue }
      const key = `shorts-${idx1}/S${String(si + 1).padStart(2, '0')}-${seg.id}`
      if (seg.text) shortsBySegKey.set(key, seg.text as string)
      si++
    }
  }
}

// --- 원고 텍스트 조회 ---
function getDisplayText(key: string): string | null {
  // 쇼츠 키
  if (key.startsWith('shorts-')) return shortsBySegKey.get(key) ?? null
  // 롱폼 공통 키
  if (key === 'A1-service-greeting') return episode.narrator?.serviceGreeting ?? null
  if (key === 'A2-service-intro') return episode.narrator?.serviceIntro ?? null
  if (key === 'B1-celeb-intro') return episode.narrator?.celebIntro ?? null
  if (key === 'B2-philosophy') return episode.host?.philosophy ?? null
  if (key === 'A3-featured-quote') return episode.host?.featuredQuote ?? null
  if (key === 'E1-outro') return episode.narrator?.outro ?? null
  // 북 키 D{NN}{phase}
  const dMatch = key.match(/^D(\d{2})([a-c])-(title|summary|context)$/)
  if (dMatch) {
    const idx = parseInt(dMatch[1]) - 1
    const book = episode.books?.[idx]
    if (!book) return null
    switch (dMatch[2]) {
      case 'a': {
        const year = book.stats?.publishYear ?? ''
        return year ? `${book.title}, ${book.creator}, ${year}` : `${book.title}, ${book.creator}`
      }
      case 'b': return book.summary ?? null
      case 'c': return book.contextMain ?? null
    }
  }
  // 인용 키 D{NN}d{N}-(quote|after)
  const qMatch = key.match(/^D(\d{2})d(\d+)-(quote|after)$/)
  if (qMatch) {
    const idx = parseInt(qMatch[1]) - 1
    const n = parseInt(qMatch[2])
    const pairIdx = Math.floor((n - 1) / 2)
    const pair = episode.books?.[idx]?.quotePairs?.[pairIdx]
    if (!pair) return null
    return qMatch[3] === 'quote' ? (pair.quote ?? null) : (pair.after ?? null)
  }
  return null
}

// --- 정규화·비교 ---
const norm = (s: string) => s
  .replace(/\s+/g, '')
  .replace(/[\u4E00-\u9FFF]/g, '')  // 한자 제거
  .replace(/[()\[\]{}「」『』'"''""《》·.,!?;:。，！？；：、]/g, '')

const freq = (s: string) => {
  const m = new Map<string, number>()
  for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1)
  return m
}

const overlap = (a: string, b: string) => {
  if (!a.length || !b.length) return 0
  const fa = freq(a), fb = freq(b)
  let common = 0
  for (const [ch, ca] of fa) common += Math.min(ca, fb.get(ch) ?? 0)
  return common / Math.max(a.length, b.length)
}

// 한국어 음절 카운트 — 한글 완성형 범위
const syllableCount = (s: string): number => {
  let n = 0
  for (const ch of s) {
    const code = ch.charCodeAt(0)
    if (code >= 0xAC00 && code <= 0xD7A3) n++      // 한글 완성형
    else if (code >= 0x30 && code <= 0x39) n++      // 아라비아 숫자는 1음절 취급(근사)
    else if (code >= 0x61 && code <= 0x7A) n += 0.5 // 영문 소문자
    else if (code >= 0x41 && code <= 0x5A) n += 0.5 // 영문 대문자
  }
  return n
}

// 한국어 TTS 평균 음절 길이 ~150ms. 압축 임계치 = 50ms/음절 (실음 불가능한 하한)
const MIN_MS_PER_SYLLABLE = 50
const EXPECTED_MS_PER_SYLLABLE = 150

// --- 진단 ---
type Issue = {
  key: string
  segIdx: number
  kind: 'text-mismatch' | 'duration-compressed'
  current: string
  expected?: string
  overlap?: number
  durationMs?: number
  expectedMs?: number
  syllables?: number
}

const issues: Issue[] = []

for (const [key, segs] of Object.entries(voiceTimings)) {
  const displayText = getDisplayText(key)
  // (A) 전체 text 오인식 비교 — joined 세그먼트 vs 원고
  //     tts.replace로 한자·괄호 등이 빠지는 정도는 norm에서 제거되므로 통과
  //     실제 Whisper 오인식만 overlap < 0.92로 걸린다
  if (displayText) {
    const joined = segs.map(s => s.text ?? '').join('')
    const a = norm(displayText)
    const b = norm(joined)
    const ov = overlap(a, b)
    if (a !== b && ov < 0.92) {
      issues.push({
        key,
        segIdx: -1,
        kind: 'text-mismatch',
        current: joined.slice(0, 80),
        expected: displayText.slice(0, 80),
        overlap: Math.round(ov * 100) / 100,
      })
    }
  }

  // (B) 세그먼트별 duration 압축 검사
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    if (seg.text == null || seg.start == null || seg.end == null) continue
    const syl = syllableCount(seg.text)
    if (syl <= 0) continue
    const durMs = (seg.end - seg.start) * 1000
    const minMs = syl * MIN_MS_PER_SYLLABLE
    if (durMs < minMs) {
      issues.push({
        key,
        segIdx: i,
        kind: 'duration-compressed',
        current: seg.text,
        durationMs: Math.round(durMs),
        expectedMs: Math.round(syl * EXPECTED_MS_PER_SYLLABLE),
        syllables: Math.round(syl * 10) / 10,
      })
    }
    // sub 단위 검사
    if (seg.sub && seg.subTimings && Array.isArray(seg.sub) && seg.sub.length > 1) {
      let prev = seg.start
      for (let si = 0; si < seg.sub.length; si++) {
        const subEnd = si < seg.subTimings.length ? seg.subTimings[si] : seg.end
        const subSyl = syllableCount(seg.sub[si])
        const subDurMs = (subEnd - prev) * 1000
        if (subSyl > 0 && subDurMs < subSyl * MIN_MS_PER_SYLLABLE) {
          issues.push({
            key: `${key}[${i}].sub[${si}]`,
            segIdx: i,
            kind: 'duration-compressed',
            current: seg.sub[si],
            durationMs: Math.round(subDurMs),
            expectedMs: Math.round(subSyl * EXPECTED_MS_PER_SYLLABLE),
            syllables: Math.round(subSyl * 10) / 10,
          })
        }
        prev = subEnd
      }
    }
  }
}

// --- 출력 ---
if (jsonMode) {
  console.log(JSON.stringify({ episode: epName, issues }, null, 2))
  process.exit(issues.length > 0 ? 1 : 0)
}

console.log(`=== reconcile-check: ${epName} ===`)
console.log(`voiceTimings 키: ${Object.keys(voiceTimings).length}`)
console.log(`탐지된 이슈: ${issues.length}`)

if (issues.length === 0) {
  console.log('✅ 보정 필요 없음')
  process.exit(0)
}

const textMismatch = issues.filter(i => i.kind === 'text-mismatch')
const durationIssues = issues.filter(i => i.kind === 'duration-compressed')

if (textMismatch.length > 0) {
  console.log(`\n⚠ Whisper text 오인식 후보 ${textMismatch.length}건`)
  for (const it of textMismatch) {
    console.log(`  [${it.key}] overlap=${it.overlap}`)
    console.log(`    원고:   ${it.expected}`)
    console.log(`    현재:   ${it.current}`)
  }
}

if (durationIssues.length > 0) {
  console.log(`\n⚠ Duration 압축 후보 ${durationIssues.length}건`)
  for (const it of durationIssues) {
    console.log(`  [${it.key}] ${it.durationMs}ms / 예상 ${it.expectedMs}ms (${it.syllables}음절)`)
    console.log(`    "${it.current}"`)
  }
}

console.log('\n→ /voice-reconcile <에피소드명> 실행하여 LLM 보정 적용')
process.exit(1)
