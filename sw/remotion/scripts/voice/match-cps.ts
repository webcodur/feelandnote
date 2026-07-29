/**
 * match-cps — book-recommend 음성 발화속도(자/초) 통일용 배속 산출기
 *
 * 목적: 각 책의 본문 필드(제목·요약·맥락·인용·후속)가 목표 발화속도(기본 6.5자/초)로
 *   들리도록 영상 배속(*PlaybackRate)을 자동 계산해 book.ko.json에 기록한다.
 *   배속은 remotion 로드 시 <Audio playbackRate>로 적용되어 렌더 결과에 그대로 반영된다.
 *
 * 계산: 원본 자/초 = 공백 제외 글자수 ÷ 실측 wav 길이(토막은 전부 합).
 *   배속 r = 목표 자/초 ÷ 원본 자/초. clampRate(0.5~2.0)로 제한.
 *   배속을 r로 걸면 재생 시간이 1/r로 줄어 실효 속도가 (원본 자/초 × r) = 목표에 수렴.
 *   배속은 필드 단위 한 값이라, 토막이 여러 개면 필드 전체 평균을 목표에 맞춘다.
 *
 * 엔진 선택: voice/<locale>/voice-select.json 의 slots[파일명] ?? default 로 wav 폴더 결정.
 *
 * 사용:
 *   tsx scripts/voice/match-cps.ts --episode elon-musk            # 전체 책 dry-run, 목표 6.5
 *   tsx scripts/voice/match-cps.ts --episode elon-musk --book 3   # 3번 책만
 *   tsx scripts/voice/match-cps.ts --episode elon-musk --book 3 --target 6.0
 *   tsx scripts/voice/match-cps.ts --episode elon-musk --field summary   # summary 필드만
 *   tsx scripts/voice/match-cps.ts --episode elon-musk --apply    # 실제 저장
 *
 * 기본은 dry-run(미리보기). --apply 를 줘야 파일을 수정한다.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ── 배속 클램프 — remotion/playback-rate.ts 와 동일 ──
const RATE_MIN = 0.5
const RATE_MAX = 2
const clampRate = (r: number) => Math.min(RATE_MAX, Math.max(RATE_MIN, r))

// ── WAV 길이 — web-bo book-recommend/server-utils.ts getAudioDuration 과 동일(RIFF) ──
function wavDuration(file: string): number {
  const buf = readFileSync(file)
  const size = statSync(file).size
  if (buf.length >= 44 && buf.toString('ascii', 0, 4) === 'RIFF') {
    const byteRate = buf.readUInt32LE(28)
    if (byteRate > 0) return +((size - 44) / byteRate).toFixed(2)
  }
  return 0
}

const cleanLen = (s: unknown) => (typeof s === 'string' ? s : '').replace(/\s/g, '').length
const pad2 = (n: number) => String(n).padStart(2, '0')

type Args = {
  episode: string
  target: number
  book?: number
  field?: string
  locale: string
  apply: boolean
}

function parseArgs(): Args {
  const a = process.argv.slice(2)
  const get = (k: string) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined }
  const episode = get('--episode')
  if (!episode) { console.error('필수: --episode <에피소드명>'); process.exit(1) }
  return {
    episode,
    target: get('--target') ? Number(get('--target')) : 6.5,
    book: get('--book') ? Number(get('--book')) : undefined,
    field: get('--field'),
    locale: get('--locale') ?? 'ko',
    apply: a.includes('--apply'),
    includeTitle: a.includes('--include-title'),
  }
}

// 필드 정의: book.ko.json 필드명 + 배속 필드명 + wav 파일 매칭 정규식 생성기
type FieldSpec = {
  key: string                 // 표시용 짧은 코드 (a/b/c/quote/after)
  label: string               // 화면 라벨
  text: string                // 본문 텍스트
  rateField: string           // book.ko.json 의 배속 필드 경로(set 대상)
  rateGet: () => number | undefined
  rateSet: (v: number | undefined) => void
  wavRe: RegExp               // 해당 필드의 wav 파일명 매칭(토막 포함)
}

function buildSpecs(book: Record<string, any>, bk: string, only: string | undefined, includeTitle: boolean, titleScript: string): FieldSpec[] {
  const specs: FieldSpec[] = []
  // only 지정 시 그 필드만(제목도 명시 가능). 미지정 시 제목은 연출 보호상 기본 제외(--include-title 로 포함).
  const add = (s: FieldSpec) => {
    if (only) { if (only === s.key) specs.push(s); return }
    if (s.key === 'title' && !includeTitle) return
    specs.push(s)
  }

  add({
    key: 'title', label: '제목', text: titleScript,
    rateField: 'titlePlaybackRate',
    rateGet: () => book.titlePlaybackRate, rateSet: v => { setOrDel(book, 'titlePlaybackRate', v) },
    wavRe: new RegExp(`^D${bk}a-title\\.wav$`),
  })
  add({
    key: 'summary', label: '요약', text: book.summary ?? '',
    rateField: 'summaryPlaybackRate',
    rateGet: () => book.summaryPlaybackRate, rateSet: v => { setOrDel(book, 'summaryPlaybackRate', v) },
    wavRe: new RegExp(`^D${bk}b\\d*-summary\\.wav$`),
  })
  add({
    key: 'context', label: '맥락', text: book.contextMain ?? '',
    rateField: 'contextMainPlaybackRate',
    rateGet: () => book.contextMainPlaybackRate, rateSet: v => { setOrDel(book, 'contextMainPlaybackRate', v) },
    wavRe: new RegExp(`^D${bk}c\\d*-context\\.wav$`),
  })
  const pairs: any[] = Array.isArray(book.quotePairs) ? book.quotePairs : []
  pairs.forEach((p, pi) => {
    const qs = pi * 2 + 1
    const as = pi * 2 + 2
    add({
      key: 'quote', label: `인용${pi + 1}`, text: p.quote ?? '',
      rateField: `quotePairs[${pi}].quotePlaybackRate`,
      rateGet: () => p.quotePlaybackRate, rateSet: v => { setOrDel(p, 'quotePlaybackRate', v) },
      wavRe: new RegExp(`^D${bk}d${qs}(_\\d+)?-quote\\.wav$`),
    })
    if (typeof p.after === 'string' && p.after.trim()) {
      add({
        key: 'after', label: `후속${pi + 1}`, text: p.after ?? '',
        rateField: `quotePairs[${pi}].afterPlaybackRate`,
        rateGet: () => p.afterPlaybackRate, rateSet: v => { setOrDel(p, 'afterPlaybackRate', v) },
        wavRe: new RegExp(`^D${bk}d${as}(_\\d+)?-after\\.wav$`),
      })
    }
  })
  return specs
}

function setOrDel(obj: Record<string, any>, key: string, v: number | undefined) {
  if (v === undefined) delete obj[key]
  else obj[key] = v
}

function main() {
  const args = parseArgs()
  const epDir = join(process.cwd(), 'public', 'episodes', args.episode)
  if (!existsSync(epDir)) { console.error(`에피소드 없음: ${epDir}`); process.exit(1) }

  // voice-select 로드 → 파일명별 엔진 결정
  const vsPath = join(epDir, 'voice', args.locale, 'voice-select.json')
  const vs = existsSync(vsPath) ? JSON.parse(readFileSync(vsPath, 'utf8')) : { default: 'gemini', slots: {} }
  const defaultEngine: string = vs.default ?? 'gemini'
  const slots: Record<string, string> = vs.slots ?? {}
  const engineFor = (filename: string) => slots[filename] ?? defaultEngine

  // 엔진별 폴더 파일 목록 캐시
  const voiceRoot = join(epDir, 'voice', args.locale)
  const engineFiles: Record<string, string[]> = {}
  const listEngine = (engine: string) => {
    if (!engineFiles[engine]) {
      const dir = join(voiceRoot, engine)
      engineFiles[engine] = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.wav')) : []
    }
    return engineFiles[engine]
  }
  // 어떤 엔진 폴더든 등장하는 모든 wav 파일명 집합(필드 매칭용)
  const allWavNames = new Set<string>()
  for (const eng of new Set([defaultEngine, ...Object.values(slots)])) listEngine(eng).forEach(f => allWavNames.add(f))

  // 필드의 wav 토막들 길이 합 — 각 파일은 voice-select 기준 엔진 폴더에서 측정
  function fieldWav(re: RegExp): { dur: number; parts: number; missing: number } {
    let dur = 0, parts = 0, missing = 0
    for (const name of allWavNames) {
      if (!re.test(name)) continue
      const engine = engineFor(name)
      const file = join(voiceRoot, engine, name)
      if (existsSync(file)) { dur += wavDuration(file); parts++ }
      else missing++
    }
    return { dur, parts, missing }
  }

  // 책 폴더 수집
  const booksDir = join(epDir, 'books')
  const bookDirs = readdirSync(booksDir)
    .filter(d => /^\d+-/.test(d) && statSync(join(booksDir, d)).isDirectory())
    .map(d => ({ dir: d, num: parseInt(d, 10) }))
    .sort((a, b) => a.num - b.num)

  // 제목 오디오 대본 — tts.ts(2-synthesize)와 동일 규약: tts.titles override 우선, 없으면 "제목, 저자, 연도".
  // 배속 집계 시 제목 글자수를 실제 발화 대본으로 세야 자/초가 맞다(book.title만 세면 저자·연도 누락으로 과속 배속).
  const metaPath = join(epDir, `meta.${args.locale}.json`)
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {}
  const titleScriptFor = (book: Record<string, any>, idx: number): string => {
    const ov = meta?.tts?.titles?.[idx]
    if (ov) return ov
    const year = book.stats?.publishYear
    return year ? `${book.title}, ${book.creator}, ${year}` : `${book.title}, ${book.creator}`
  }

  console.log(`\n■ ${args.episode} / 목표 ${args.target}자/초 / ${args.apply ? '적용(저장)' : 'dry-run(미리보기)'}\n`)

  let touched = 0
  const clampWarn: string[] = []

  for (const { dir, num } of bookDirs) {
    if (args.book !== undefined && num !== args.book) continue
    const bk = pad2(num)
    const jsonPath = join(booksDir, dir, `book.${args.locale}.json`)
    if (!existsSync(jsonPath)) continue
    const raw = readFileSync(jsonPath, 'utf8')
    const book = JSON.parse(raw)
    const specs = buildSpecs(book, bk, args.field, args.includeTitle, titleScriptFor(book, num - 1))
    if (specs.length === 0) continue

    console.log(`【책 ${num}】 ${dir}`)
    let bookTouched = false

    for (const s of specs) {
      const chars = cleanLen(s.text)
      if (chars === 0) continue
      const { dur, parts, missing } = fieldWav(s.wavRe)
      if (dur === 0) {
        console.log(`  ${s.label.padEnd(6)} ${String(chars).padStart(4)}자  음성없음(skip)${missing ? ` 누락 ${missing}` : ''}`)
        continue
      }
      const cps = chars / dur
      const rRaw = args.target / cps
      const r = +clampRate(rRaw).toFixed(2)
      const clamped = Math.abs(r - rRaw) > 0.005
      const effective = +(cps * r).toFixed(2)
      const prev = s.rateGet()
      const partTag = parts > 1 ? `(${parts}토막)` : ''
      const clampTag = clamped ? ` ⚠클램프→실효 ${effective}자/초` : ''
      const prevTag = prev !== undefined ? ` (현재 ×${prev})` : ''
      console.log(
        `  ${s.label.padEnd(6)} ${String(chars).padStart(4)}자 ÷ ${dur.toFixed(1)}초${partTag} = ${cps.toFixed(2)}자/초 → ×${r.toFixed(2)}${prevTag}${clampTag}`
      )
      if (clamped) clampWarn.push(`책${num} ${s.label}: 실효 ${effective}자/초 (목표 ${args.target} 미달)`)

      // 적용 대상: 의미 있는 변화만(±0.005 이내 1.00은 원본 유지)
      const targetVal = Math.abs(r - 1) < 0.005 ? undefined : r
      if (targetVal !== prev) {
        s.rateSet(targetVal)
        bookTouched = true
        touched++
      }
    }

    if (args.apply && bookTouched) {
      writeFileSync(jsonPath, JSON.stringify(book, null, 2) + '\n', 'utf8')
      console.log(`  ✔ 저장: ${jsonPath}`)
    }
    console.log('')
  }

  if (clampWarn.length) {
    console.log('── 클램프 경고(0.5~2.0 한계로 목표 미달) ──')
    clampWarn.forEach(w => console.log('  ' + w))
    console.log('')
  }
  if (!args.apply) {
    console.log(`※ dry-run. 적용하려면 --apply 추가. (변경 예정 ${touched}건)`)
  } else {
    console.log(`완료. 배속 ${touched}건 반영.`)
  }
}

main()
