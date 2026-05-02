/**
 * 1-pronounce.ts — 음성 파이프라인 1단계 (Synthesis): 본문 발화 규칙 결정
 *
 * "텍스트를 합성기가 정확히 어떻게 발음할지" 를 결정·등록하는 단계.
 * 본문 전수 스캔으로 모호 표기(주로 숫자+단위)를 발견하고,
 * tts.replace 맵에 누락된 항목을 LLM 판단으로 등록한다.
 *
 * 두 모드:
 *   --dry-run  : 누락 목록만 출력, ko.json 변경 없음 (기본)
 *   --apply    : LLM 호출 결과를 받아 ko.json의 tts.replace 자동 병합
 *
 * LLM 호출 자체는 이 스크립트가 아닌 `/voice-pronounce` 스킬이 담당.
 * 스킬은 dry-run 결과를 받아 LLM에 전달 → 발화 규칙 JSON을 만들고 --input 으로 적용.
 *
 * Usage:
 *   pnpm voice:pronounce -- --episode <name>                          # dry-run (기본)
 *   pnpm voice:pronounce -- --episode <name> --json                   # JSON 출력 (스킬용)
 *   pnpm voice:pronounce -- --episode <name> --apply --input new.json # 적용
 *
 * 누락 검출 패턴: \d+(?:,\d+)?[가-힣]+ — 숫자(쉼표 포함) + 한글 단위
 *   예: "1865년", "10권의", "8개월이", "1,704명" 등
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { findEpisodeDir } from '../lib/episode.js'

const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null
const jsonMode = args.includes('--json')
const applyMode = args.includes('--apply')
const inputIdx = args.indexOf('--input')
const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : null

if (!epName) {
  console.error('Usage: pnpm voice:pronounce -- --episode <name> [--json] [--apply --input new.json]')
  process.exit(1)
}
if (applyMode && !inputPath) {
  console.error('--apply 모드는 --input <new-replace.json> 필수')
  process.exit(1)
}

// ─── 에피소드 로드 ───
const isEn = epName.endsWith('-en')
const base = isEn ? epName.slice(0, -3) : epName
const partMatch = base.match(/-(\d+)$/)
const person = partMatch ? base.slice(0, -partMatch[0].length) : base
const locale = isEn ? 'en' : 'ko'
const part = partMatch ? parseInt(partMatch[1]) : 1
const filename = part > 1 ? `${locale}-${part}.json` : `${locale}.json`
const epPath = join(findEpisodeDir(person), filename)
const episode = JSON.parse(readFileSync(epPath, 'utf-8'))

// ─── 본문 텍스트 전수 수집 ───
const texts: Array<{ field: string; text: string }> = []
const n = episode.narrator ?? {}
for (const k of ['serviceGreeting', 'serviceIntro', 'celebIntro', 'bridge', 'outro', 'interlude', 'returnIntro', 'prevRecap']) {
  if (n[k]) texts.push({ field: `narrator.${k}`, text: n[k] })
}
const h = episode.host ?? {}
for (const k of ['philosophy', 'featuredQuote', 'bio', 'title']) {
  if (h[k]) texts.push({ field: `host.${k}`, text: h[k] })
}
for (let i = 0; i < (episode.books ?? []).length; i++) {
  const b = episode.books[i]
  for (const k of ['summary', 'contextMain']) {
    if (b[k]) texts.push({ field: `books[${i}].${k}`, text: b[k] })
  }
  for (let qi = 0; qi < (b.quotePairs ?? []).length; qi++) {
    const p = b.quotePairs[qi]
    for (const k of ['quote', 'after']) {
      if (p[k]) texts.push({ field: `books[${i}].pair[${qi}].${k}`, text: p[k] })
    }
  }
}

// ─── 숫자+한글 패턴 추출 ───
type Hit = { token: string; field: string; context: string }
const hits: Hit[] = []
const seen = new Set<string>()
const patternRe = /\d+(?:,\d+)?[가-힣]+/g

for (const { field, text } of texts) {
  let m: RegExpExecArray | null
  while ((m = patternRe.exec(text)) !== null) {
    const token = m[0]
    // 전후 30자 컨텍스트
    const s = Math.max(0, m.index - 30)
    const e = Math.min(text.length, m.index + token.length + 30)
    const context = text.slice(s, e)
    hits.push({ token, field, context })
  }
}

// 중복 token 제거
const uniqueTokens: Map<string, Hit[]> = new Map()
for (const h of hits) {
  if (!uniqueTokens.has(h.token)) uniqueTokens.set(h.token, [])
  uniqueTokens.get(h.token)!.push(h)
  seen.add(h.token)
}

// ─── 기존 tts.replace와 비교 ───
const existing = new Set(Object.keys((episode.tts?.replace as Record<string, string>) ?? {}))
const missing: Array<{ token: string; contexts: string[] }> = []
for (const [token, hs] of uniqueTokens) {
  if (existing.has(token)) continue
  // "1865년" 같은 키가 있으면 "1865년에"도 가려짐 — startsWith 체크
  let covered = false
  for (const k of existing) {
    if (token.startsWith(k)) { covered = true; break }
  }
  if (!covered) missing.push({ token, contexts: hs.map(h => h.context) })
}

// ─── --apply: LLM 결과 병합 ───
if (applyMode) {
  const newReplace: Record<string, string> = JSON.parse(readFileSync(inputPath!, 'utf-8'))
  const ttsBlock = episode.tts ?? {}
  ttsBlock.replace = { ...(ttsBlock.replace ?? {}), ...newReplace }
  episode.tts = ttsBlock
  writeFileSync(epPath, JSON.stringify(episode, null, 2) + '\n', 'utf-8')
  const added = Object.keys(newReplace).filter(k => !existing.has(k))
  console.log(`✅ tts.replace에 ${added.length}건 신규 등록 (전체 ${Object.keys(newReplace).length}건 중)`)
  added.slice(0, 20).forEach(k => console.log(`  + "${k}": "${newReplace[k]}"`))
  if (added.length > 20) console.log(`  ... 외 ${added.length - 20}건`)
  process.exit(0)
}

// ─── 기본: dry-run 보고 ───
if (jsonMode) {
  console.log(JSON.stringify({ episode: epName, missing, total: missing.length }, null, 2))
  process.exit(0)
}

console.log(`=== ${epName}: 본문 발화 규칙 점검 ===`)
console.log(`전체 숫자+단위 토큰: ${uniqueTokens.size}개`)
console.log(`tts.replace 등록됨: ${uniqueTokens.size - missing.length}개`)
console.log(`누락: ${missing.length}개\n`)

if (missing.length === 0) {
  console.log('✅ 모든 토큰이 tts.replace에 등록됨')
  process.exit(0)
}

console.log('⚠ 누락 토큰:')
for (const m of missing) {
  console.log(`\n  ${m.token}`)
  m.contexts.slice(0, 2).forEach(c => console.log(`    "${c}"`))
}
console.log(`\n→ /voice-pronounce <ep> 실행하여 LLM이 발화 규칙 결정 + 자동 등록`)
console.log(`  (직접 등록은 ko.json의 tts.replace 수정)`)
