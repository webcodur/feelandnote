/**
 * 3-timings.ts — 음성 파이프라인 3단계: 단어 단위 voiceTimings + duration + imageChangeAt 해소
 *
 * 2-whisper.py가 생성한 voice/{locale}/2-word-timings.json 의 단어 타임스탬프를
 * 읽어 voiceTimings에 반영한다. 2-word-timings.json 이 없으면 SENTENCE_SPLIT + RMS 폴백.
 *
 * 출력:
 *  - {locale}.timing.json : voiceTimings + duration
 *  - shorts/{locale}-N.timing.json : 쇼츠 duration + imageChangeAt
 *
 * Usage:
 *   pnpm voice:align -- --episode alexander-the-great --long --update-json
 *   pnpm voice:align -- --episode alexander-the-great --shorts 1 --update-json --export-debug
 *   pnpm voice:align -- --episode alexander-the-great --long --only D05b-summary
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { SENTENCE_SPLIT } from '../../src/compositions/BookRecommend/sentence-split'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO,
  VN_CELEB_INTRO, VN_PHILOSOPHY, VN_OUTRO, VN_FEATURED_QUOTE,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  VN_RETURN_INTRO, VN_INTERLUDE,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookAfter,
  vnShort, vnSolo, vnTimingKey, resolveVoiceRelPath,
} from '../../src/compositions/BookRecommend/voice-names'
import { bookFieldParts, FIELD_PART_GAP_SEC } from '../../src/compositions/BookRecommend/field-parts'
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath, resolveTimingPath, isNewLayout, loadEpisode } from '../lib/episode.js'
import {
  parseWav, detectSilences, analyzeWithWhisperWords, trimWordLeadingSilence,
  mergeIntoPhrases, adjustPhraseBoundaries, fixNumericWordTimings, analyzeWithSilence,
  computeSubTimings, SUB_MISSING_MIN_LEN, SUB_MAX_LEN,
  type SentenceTiming, type WhisperWord,
} from './lib/align-core.js'

// --- 디버그 출력용 50ms RMS — voice-timing-for-agent.md 참조 ---
function computeDebugRms(path: string): number[] {
  const { sampleRate, samples } = parseWav(path)
  const windowSize = Math.round(sampleRate * 0.05) // 50ms
  const rms: number[] = []
  for (let i = 0; i < samples.length; i += windowSize) {
    let sum = 0
    const end = Math.min(i + windowSize, samples.length)
    for (let j = i; j < end; j++) sum += samples[j] * samples[j]
    rms.push(Math.round(Math.sqrt(sum / (end - i)) * 1000) / 1000)
  }
  return rms
}

// --- 텍스트 조회 ---
/** SOLO 마디 표시 텍스트 — buildSoloSegments(solo-build.ts) 와 동일 규약.
 *  정형부(greeting/intro/title/outro)는 책·인물 데이터로 동적 생성,
 *  자유섹션은 episode._soloSections 에서 id 매칭. 없으면 null(=스킵). */
function getSoloDisplayText(episode: any, segId: string): string | null {
  const book = episode._soloBook
  if (!book) return null
  const host = episode.host ?? {}
  const narrator = episode.narrator ?? {}
  const title = book.title ?? ''
  const creator = book.creator ?? ''
  const nickname = host.nickname ?? ''
  const isEn = episode.locale === 'en'
  switch (segId) {
    case 'greeting': return narrator.serviceGreeting ?? null
    case 'intro':
      return isEn
        ? `Today's book — ${title} by ${creator}, brought to you by ${host.nickname_en ?? nickname}.`
        : `오늘의 한 권은 ${nickname}의 서재에서 꺼낸 ${title}입니다.`
    case 'title': return `${title}\n${creator}`
    case 'outro':
      return isEn
        ? `That was ${title}, one book from ${host.nickname_en ?? nickname}'s shelf.`
        : `이상으로 ${nickname}의 한 권, ${title}이었습니다.`
    default: {
      const sections = (episode._soloSections ?? []) as Array<{ id: string; text?: string }>
      const s = sections.find(x => x.id === segId)
      return s?.text ?? null
    }
  }
}

/** 화면 표시용 텍스트 (TTS 오버라이드 무시). 문장 분할 기준으로 사용 */
function getDisplayText(episode: any, textField: string, bookIndex?: number): string | null {
  if (bookIndex !== undefined) {
    const book = episode.books[bookIndex]
    const quoteMatch = textField.match(/^quote:(\d+)$/)
    if (quoteMatch) return book?.quotePairs?.[parseInt(quoteMatch[1])]?.quote ?? null
    // 후속 맥락 토막 — after:PI:AP (분할 시). PI = 인용 쌍, AP = 토막 인덱스
    const afterPartMatch = textField.match(/^after:(\d+):(\d+)$/)
    if (afterPartMatch) {
      const pair = book?.quotePairs?.[parseInt(afterPartMatch[1])]
      return bookFieldParts(pair?.after, pair?.afterParts)[parseInt(afterPartMatch[2])] ?? null
    }
    const afterMatch = textField.match(/^after:(\d+)$/)
    if (afterMatch) return book?.quotePairs?.[parseInt(afterMatch[1])]?.after ?? null
    // 토막 분할 필드 — summary:N / contextMain:N (N = 토막 인덱스, 0-based)
    const partMatch = textField.match(/^(summary|contextMain):(\d+)$/)
    if (partMatch) {
      const parts = partMatch[1] === 'summary'
        ? bookFieldParts(book?.summary, book?.summaryParts)
        : bookFieldParts(book?.contextMain, book?.contextMainParts)
      return parts[parseInt(partMatch[2])] ?? null
    }
    return book?.[textField] ?? null
  }
  switch (textField) {
    case 'celebIntro': return episode.narrator.celebIntro
    case 'philosophy': return episode.host.philosophy
    case 'featuredQuote': return episode.host.featuredQuote
    case 'outro': return episode.narrator.outro
    case 'serviceGreeting': return episode.narrator.serviceGreeting
    case 'serviceIntro': return episode.narrator.serviceIntro
    default:
      // textField: 'solo-{segId}' — buildSoloSegments(solo-build.ts) 와 동일 규약.
      // 정형부(greeting/intro/title/outro)는 책·인물 데이터로 동적 생성, 그 외는 _soloSections id 매칭.
      if (textField.startsWith('solo-')) {
        return getSoloDisplayText(episode, textField.slice('solo-'.length))
      }
      // textField: 'short-{shortsIdx}-{segId}' — shortsIdx는 1-based
      if (textField.startsWith('short-')) {
        const rest = textField.replace('short-', '')
        const m = rest.match(/^(\d+)-(.+)$/)
        if (!m) return null
        const shortsIdx1 = parseInt(m[1]) // 1-based
        const segId = m[2]
        const shortsArr = Array.isArray(episode.shorts) ? episode.shorts : []
        // _shortsIdx1로 식별 (gap 있을 수 있음)
        const target = shortsArr.find((s: any) => s?._shortsIdx1 === shortsIdx1)
        const seg = target?.segments?.find((s: any) => s.id === segId)
        return seg?.text ?? null
      }
      return null
  }
}

// --- CLI ---
const args = process.argv.slice(2)

// 허용 플래그 검증 — 오타·미지원 플래그 유입 방지
const KNOWN_FLAGS = new Set(['--episode', '--only', '--exclude', '--shorts', '--solo', '--long', '--update-json', '--export-debug'])
for (const arg of args) {
  if (arg === '--') continue
  if (arg.startsWith('--') && !KNOWN_FLAGS.has(arg)) {
    throw new Error(`알 수 없는 플래그: ${arg} (허용: ${[...KNOWN_FLAGS].join(', ')})`)
  }
}

const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null
const onlyIdx = args.indexOf('--only')
const onlyFilter = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null
const excludeIdx = args.indexOf('--exclude')
const excludeFilter = excludeIdx >= 0 ? args[excludeIdx + 1].split(',') : null
const updateJson = args.includes('--update-json')
const exportDebug = args.includes('--export-debug')

const USAGE = 'Usage: pnpm voice:align -- --episode <name> (--long | --shorts <N> | --solo <N>) [--only file1,file2] [--exclude file1,file2] [--update-json] [--export-debug]'

if (!epName) {
  console.error(USAGE)
  process.exit(1)
}

// 단일 타겟 스코프: --long / --shorts <N> / --solo <N> 정확히 하나 필수
const SHORTS_FLAG_IDX = args.indexOf('--shorts')
const SOLO_FLAG_IDX = args.indexOf('--solo')
const HAS_LONG_FLAG = args.includes('--long')
let SHORTS_INDEX: number | null = null
if (SHORTS_FLAG_IDX >= 0) {
  const raw = args[SHORTS_FLAG_IDX + 1]
  const parsed = raw !== undefined ? Number(raw) : NaN
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`✗ --shorts 인자는 1 이상 정수여야 한다. 받은 값: ${raw ?? '(없음)'}`)
    console.error(`  ${USAGE}`)
    process.exit(1)
  }
  SHORTS_INDEX = parsed
}
// SOLO_BOOK_INDEX: 1-based 책 인덱스 (--solo <N>)
let SOLO_BOOK_INDEX: number | null = null
if (SOLO_FLAG_IDX >= 0) {
  const raw = args[SOLO_FLAG_IDX + 1]
  const parsed = raw !== undefined ? Number(raw) : NaN
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`✗ --solo 인자는 1 이상 정수여야 한다. 받은 값: ${raw ?? '(없음)'}`)
    console.error(`  ${USAGE}`)
    process.exit(1)
  }
  SOLO_BOOK_INDEX = parsed
}
const SCOPE_COUNT = (HAS_LONG_FLAG ? 1 : 0) + (SHORTS_INDEX !== null ? 1 : 0) + (SOLO_BOOK_INDEX !== null ? 1 : 0)
if (SCOPE_COUNT !== 1) {
  console.error('✗ --long / --shorts <N> / --solo <N> 중 정확히 하나만 지정해야 한다.')
  console.error(`  ${USAGE}`)
  process.exit(1)
}

const { person: epPerson, locale: epLocale } = parseEpName(epName)
const episodeDir = findEpisodeDir(epPerson)
const voiceBaseDir = join(episodeDir, 'voice', epLocale)
const shortsDir = join(episodeDir, 'shorts')
// voice-select.json이 있으면 엔진 하위 디렉토리 사용
let voiceSelect: { default: string; slots?: Record<string, string> } | null = null
try {
  voiceSelect = JSON.parse(readFileSync(join(voiceBaseDir, 'voice-select.json'), 'utf-8'))
} catch { /* voice-select 없으면 null */ }
const NEW_LAYOUT = isNewLayout(episodeDir, epLocale)
const epPath = resolveEpisodePath(epName)  // 신구조면 meta.{locale}.json, 레거시면 {locale}.json
const timingPath = resolveTimingPath(epName)  // 신구조면 meta.{locale}.timing.json
const episode = JSON.parse(readFileSync(epPath, 'utf-8'))
let timing: any = {}
try { timing = JSON.parse(readFileSync(timingPath, 'utf-8')) } catch { /* 신규 에피소드 */ }

// voiceTimings를 episode에 합침 (기존 코드 호환)
if (timing.voiceTimings) episode.voiceTimings = timing.voiceTimings
// duration도 합침
if (timing.narrator) Object.assign(episode.narrator, timing.narrator)
if (timing.host) Object.assign(episode.host, timing.host)

// 신구조: books/{NN-*}/book.{locale}.json + book.{locale}.timing.json 동기 로드
// 레거시: timing.books → episode.books[i] 머지
const BOOK_FOLDERS: string[] = NEW_LAYOUT
  ? readdirSync(join(episodeDir, 'books'))
      .filter(name => statSync(join(episodeDir, 'books', name)).isDirectory() && /^\d+-/.test(name))
      .sort()
  : []
// 합성·composition은 활성 쇼츠(=shorts.{locale}.json 보유 폴더) 1-based 인덱스를 사용한다.
// SHORTS_INDEX 도 동일 규약으로 해석해 책 prefix 인덱스와 분리한다.
const SHORTS_FOLDERS: string[] = NEW_LAYOUT
  ? BOOK_FOLDERS.filter(name =>
      existsSync(join(episodeDir, 'books', name, `shorts.${epLocale}.json`)),
    )
  : []
// 폴더 → 고정 slot 맵. 파일 slot 우선, 없으면 max+폴더순(미발행분 뒤로). slot 전무 시 1..N(폴더순, 기존 동작).
const SHORTS_SLOT_BY_FOLDER = new Map<string, number>()
if (NEW_LAYOUT) {
  const cfgs = SHORTS_FOLDERS.map(name => {
    try { return JSON.parse(readFileSync(join(episodeDir, 'books', name, `shorts.${epLocale}.json`), 'utf-8')) }
    catch { return {} }
  })
  let maxSlot = 0
  for (const c of cfgs) if (typeof c?.slot === 'number') maxSlot = Math.max(maxSlot, c.slot)
  SHORTS_FOLDERS.forEach((name, i) => {
    const c = cfgs[i]
    SHORTS_SLOT_BY_FOLDER.set(name, typeof c?.slot === 'number' ? c.slot : ++maxSlot)
  })
}
/** 고정 slot → 책 폴더명 (배열 위치 아님). */
function shortsFolderBySlot(slot: number): string | undefined {
  for (const [name, s] of SHORTS_SLOT_BY_FOLDER) if (s === slot) return name
  return undefined
}
if (NEW_LAYOUT) {
  episode.books = []
  for (let i = 0; i < BOOK_FOLDERS.length; i++) {
    const bd = join(episodeDir, 'books', BOOK_FOLDERS[i])
    const bookFp = join(bd, `book.${epLocale}.json`)
    if (!existsSync(bookFp)) continue
    const book: any = JSON.parse(readFileSync(bookFp, 'utf-8'))
    const bookTfp = join(bd, `book.${epLocale}.timing.json`)
    let bookT: any = {}
    if (existsSync(bookTfp)) {
      try { bookT = JSON.parse(readFileSync(bookTfp, 'utf-8')) } catch { /* corrupt */ }
    }
    Object.assign(book, bookT)
    if (bookT.quotePairDurations && Array.isArray(book.quotePairs)) {
      book.quotePairs = book.quotePairs.map((p: any, pi: number) => ({
        ...p, ...(bookT.quotePairDurations[pi] ?? {}),
      }))
      delete book.quotePairDurations
    }
    episode.books.push(book)
  }
} else if (timing.books) {
  timing.books.forEach((bt: any, i: number) => {
    if (episode.books[i]) Object.assign(episode.books[i], bt)
  })
}

// 옵션 2: 쇼츠 본체는 shorts/{locale}-{N}.json 외부 파일 (레거시)
// 신구조: books/{NN-*}/shorts.{locale}.json — shortsIdx1 ↔ 책 폴더 idx0 매핑
// 쇼츠 타이밍은 shorts/{locale}-{N}.timing.json 또는 books/{folder}/shorts.{locale}.timing.json
// 본체 timing.shorts는 더 이상 사용하지 않는다.
//
// 단일 타겟 스코프 — 로드 단계에서 격리하여 후속 로직(targets push, 저장 루프)이
// 다른 쇼츠를 건드리지 않도록 한다. 이게 없으면 저장 루프가 기존 timing.json을 재기록해
// 다른 쇼츠의 텍스트 수정 결과를 덮어쓰는 버그가 발생한다.
function resolveShortsContentPath(idx1: number): string | null {
  if (NEW_LAYOUT) {
    const folder = shortsFolderBySlot(idx1)
    if (!folder) return null
    return join(episodeDir, 'books', folder, `shorts.${epLocale}.json`)
  }
  return join(shortsDir, `${epLocale}-${idx1}.json`)
}
function resolveShortsTimingPathFn(idx1: number): string | null {
  if (NEW_LAYOUT) {
    const folder = shortsFolderBySlot(idx1)
    if (!folder) return null
    return join(episodeDir, 'books', folder, `shorts.${epLocale}.timing.json`)
  }
  return join(shortsDir, `${epLocale}-${idx1}.timing.json`)
}
episode.shorts = []
if (SHORTS_INDEX !== null) {
  const idx1 = SHORTS_INDEX
  const contentPath = resolveShortsContentPath(idx1)
  if (!contentPath || !existsSync(contentPath)) {
    const shown = NEW_LAYOUT
      ? `books/${shortsFolderBySlot(idx1) ?? `<slot-${idx1}>`}/shorts.${epLocale}.json`
      : `shorts/${epLocale}-${idx1}.json`
    console.error(`✗ ${shown} 이 없다`)
    process.exit(1)
  }
  const c = JSON.parse(readFileSync(contentPath, 'utf-8'))
  const timingPathShorts = resolveShortsTimingPathFn(idx1)!
  let t: any = null
  if (existsSync(timingPathShorts)) {
    try { t = JSON.parse(readFileSync(timingPathShorts, 'utf-8')) } catch { /* corrupt → null */ }
  }
  if (!t?.segments) {
    episode.shorts = [{ ...c, _shortsIdx1: idx1 }]
  } else {
    episode.shorts = [{
      ...c,
      segments: c.segments.map((seg: any, i: number) => {
        const tseg = t.segments[i] ?? {}
        // imageChangeAt은 본문(content) 단일원천. timing 보존을 차단해야
        // 본문에서 삭제·변경된 앵커가 옛 timing 머지로 잔존하지 않는다.
        const { imageChangeAt: _ignoreTimingAnchors, ...tsegRest } = tseg
        return { ...seg, ...tsegRest }
      }),
      _shortsIdx1: idx1,
    }]
  }
}
// --long 일 때는 episode.shorts가 빈 배열로 유지된다 (shorts 처리 전부 생략)

// 솔로 스코프 — 대상 책 + 자유섹션 로드 (getSoloDisplayText 가 참조)
let SOLO_MARKER_IDS: string[] = []
if (SOLO_BOOK_INDEX !== null) {
  const bookIdx0 = SOLO_BOOK_INDEX - 1
  const soloBook = episode.books[bookIdx0]
  if (!soloBook) {
    console.error(`✗ --solo ${SOLO_BOOK_INDEX}: 책이 없다 (책 ${episode.books.length}권)`)
    process.exit(1)
  }
  episode._soloBook = soloBook
  // solo.{locale}.json sections 로드 (신구조 책 폴더). 없으면 정형부만.
  let soloSections: Array<{ id: string; text?: string }> = []
  if (NEW_LAYOUT && BOOK_FOLDERS[bookIdx0]) {
    const soloFp = join(episodeDir, 'books', BOOK_FOLDERS[bookIdx0], `solo.${epLocale}.json`)
    if (existsSync(soloFp)) {
      try {
        const raw = JSON.parse(readFileSync(soloFp, 'utf-8'))
        soloSections = (Array.isArray(raw) ? raw : raw.sections) ?? []
      } catch { /* corrupt → 정형부만 */ }
    }
  }
  episode._soloSections = soloSections
  // buildSoloSegments(solo-build.ts) 마디 전체 순서: [greeting?] → intro → title → 자유섹션 → outro
  if (episode.narrator?.serviceGreeting) SOLO_MARKER_IDS.push('greeting')
  SOLO_MARKER_IDS.push('intro', 'title')
  for (const s of soloSections) {
    if ((s.text ?? '').trim()) SOLO_MARKER_IDS.push(s.id)
  }
  SOLO_MARKER_IDS.push('outro')
}

// 분석 대상
type Target = { file: string; textField: string; bookIndex?: number }
const targets: Target[] = []

// 단일 타겟 스코프 — 롱폼 타겟은 --long 일 때만 push
if (HAS_LONG_FLAG) {
  if (episode.narrator.serviceGreeting) {
    targets.push({ file: VN_SERVICE_GREETING, textField: 'serviceGreeting' })
  }
  targets.push({ file: VN_SERVICE_INTRO, textField: 'serviceIntro' })
  targets.push({ file: VN_CELEB_INTRO, textField: 'celebIntro' })
  targets.push({ file: VN_PHILOSOPHY, textField: 'philosophy' })
  if (episode.host.featuredQuote) {
    targets.push({ file: VN_FEATURED_QUOTE, textField: 'featuredQuote' })
  }
  targets.push({ file: VN_OUTRO, textField: 'outro' })

  for (let i = 0; i < episode.books.length; i++) {
    targets.push({ file: vnBookTitle(i), textField: 'title', bookIndex: i })
    const b = episode.books[i]
    const summaryN = bookFieldParts(b.summary, b.summaryParts).length
    for (let p = 0; p < summaryN; p++) {
      targets.push({ file: vnBookSummary(i, p), textField: `summary:${p}`, bookIndex: i })
    }
    const contextN = bookFieldParts(b.contextMain, b.contextMainParts).length
    for (let p = 0; p < contextN; p++) {
      targets.push({ file: vnBookContext(i, p), textField: `contextMain:${p}`, bookIndex: i })
    }
    for (let pi = 0; pi < (episode.books[i].quotePairs?.length ?? 0); pi++) {
      const pair = episode.books[i].quotePairs![pi]
      if (pair.quote) targets.push({ file: vnBookQuote(i, pi), textField: `quote:${pi}`, bookIndex: i })
      // 후속 맥락 — 토막 분할 시 토막마다 별도 타겟 (분할 없으면 1개 = 기존과 동일)
      const afterN = bookFieldParts(pair.after, pair.afterParts).length
      for (let ap = 0; ap < afterN; ap++) {
        targets.push({ file: vnBookAfter(i, pi, ap), textField: `after:${pi}:${ap}`, bookIndex: i })
      }
    }
  }
}

// 솔로 타겟 — 마디 전체 순서대로 vnSolo(bookIdx0, segIdx, segId). wav 없는 타겟은
// 처리 루프에서 detectSilences 가 던지는 예외로 자연 스킵된다(graceful).
if (SOLO_BOOK_INDEX !== null) {
  const bookIdx0 = SOLO_BOOK_INDEX - 1
  SOLO_MARKER_IDS.forEach((segId, segIdx) => {
    targets.push({
      file: vnSolo(bookIdx0, segIdx, segId),
      textField: `solo-${segId}`,
    })
  })
}

// 옵션 2: shorts 배열은 외부 파일에서 이미 로드됨. shortsIdx는 1-based
// 단일 타겟 스코프 — episode.shorts는 SHORTS_INDEX != null일 때만 1개 원소 보유, 그 외 빈 배열
const shortsArrForTargets: any[] = Array.isArray(episode.shorts) ? episode.shorts : []
for (const cfg of shortsArrForTargets) {
  if (!cfg?.segments) continue
  const shortsIdx1: number = cfg._shortsIdx1 // 1-based
  let si = 0
  for (const seg of cfg.segments as Array<{ id: string; visual?: string }>) {
    targets.push({
      file: vnShort(si, seg.id, shortsIdx1),
      textField: `short-${shortsIdx1}-${seg.id}`,
    })
    si++
  }
}

// 단일 타겟 스코프는 episode.shorts 로드 단계에서 이미 격리됨.
// 여기서는 --only / --exclude 필터만 적용한다.
let filtered = onlyFilter
  ? targets.filter(t => onlyFilter.some(f => t.file.includes(f)))
  : targets
if (excludeFilter) {
  filtered = filtered.filter(t => !excludeFilter.some(f => t.file.includes(f)))
}

console.log(`에피소드: ${epName}`)
console.log(`${filtered.length}개 파일 분석 (텍스트+파형 결합)\n`)

const results: Record<string, SentenceTiming[]> = {}
const wordResults: Record<string, SentenceTiming[]> = {} // sub 경계 계산용
const debugTargets: Record<string, any> = {}

// Whisper 데이터 로드 (있으면 갭 기반 우선)
let whisperData: Record<string, WhisperWord[]> = {}
try {
  const whisperPath = join(voiceBaseDir, '2-word-timings.json')
  const raw = JSON.parse(readFileSync(whisperPath, 'utf-8'))
  whisperData = raw.targets ?? raw
} catch { /* whisper 없으면 폴백 */ }
const hasWhisper = Object.keys(whisperData).length > 0
console.log(hasWhisper ? '단어 단위 매핑 (whisperx + diff)' : 'Whisper 없음 — SENTENCE_SPLIT 폴백')

for (const target of filtered) {
  const locale = episode.locale === 'en' ? 'en' as const : 'ko' as const
  const { dir, subPath } = resolveVoiceRelPath(target.file, voiceSelect, locale, !!episode.host?.elevenlabsVoiceId)
  const commonLocale = episode.locale === 'en' ? 'en' : 'ko'
  let wavPath = dir === 'common'
    ? join(ROOT, 'public', 'common', 'voice', commonLocale, subPath)
    : join(voiceBaseDir, subPath)
  // 엔진 폴백 — voice-select default 엔진 경로에 없으면 elevenlabs 쪽 동일 상대 경로를 시도.
  // 솔로 actor 마디(elevenlabs 전용)처럼 default(gemini) 경로에 없는 파일을 잡는다.
  if (dir === 'episode' && !existsSync(wavPath)) {
    const elePath = join(voiceBaseDir, 'elevenlabs', target.file)
    if (existsSync(elePath)) wavPath = elePath
  }
  const displayText = getDisplayText(episode, target.textField, target.bookIndex)

  if (!displayText) {
    console.log(`[${target.file}] 텍스트 없음 — 건너뜀`)
    continue
  }

  try {
    const whisperKey = vnTimingKey(target.file)
    const whisperWords = whisperData[whisperKey] ?? whisperData[target.file]
    const { duration } = detectSilences(wavPath)

    let timings = whisperWords
      ? analyzeWithWhisperWords(whisperWords, duration)
      : analyzeWithSilence(wavPath, displayText)

    let wordSegments: SentenceTiming[] | undefined
    if (whisperWords) {
      trimWordLeadingSilence(timings, wavPath)
      wordSegments = timings.map(t => ({ ...t })) // merge 전 단어 보존
      timings = mergeIntoPhrases(timings)
      adjustPhraseBoundaries(timings, wavPath)
    }

    results[target.file] = timings
    if (wordSegments) wordResults[target.file] = wordSegments

    const method = whisperWords ? 'whisper' : 'fallback'
    console.log(`[${target.file}] ${timings.length} segments (${method})`)
    timings.forEach((t, i) => {
      const preview = (t.text ?? '').length > 30 ? (t.text ?? '').slice(0, 30) + '...' : (t.text ?? '')
      console.log(`  ${i + 1}. ${t.start.toFixed(2)}s ~ ${t.end.toFixed(2)}s  "${preview}"`)
    })

    if (exportDebug) {
      const dbgRms = computeDebugRms(wavPath)
      const { duration: dbgDur, silences: dbgSil } = detectSilences(wavPath)
      debugTargets[vnTimingKey(target.file)] = {
        duration: dbgDur, windowMs: 50, rms: dbgRms,
        silences: dbgSil.map(s => ({ start: Math.round(s.start * 1000) / 1000, end: Math.round(s.end * 1000) / 1000 })),
        sentences: displayText.split(SENTENCE_SPLIT).filter(Boolean), draft: timings,
      }
    }
  } catch (e: any) {
    console.log(`[${target.file}] 건너뜀 — ${e.message}`)
  }
}

if (updateJson) {
  if (!episode.voiceTimings) episode.voiceTimings = {}
  for (const [file, timings] of Object.entries(results)) {
    const key = vnTimingKey(file)
    // 기존 sub 보존: 텍스트가 동일한 세그먼트의 sub를 이식
    const oldTimings = episode.voiceTimings[key] as Array<{ text?: string; sub?: string[]; subTimings?: number[] }> | undefined
    if (oldTimings) {
      for (const seg of timings) {
        if (!seg.text) continue
        const old = oldTimings.find((o: { text?: string; sub?: string[] }) => o.text === seg.text && o.sub)
        if (old) (seg as any).sub = old.sub
      }
    }
    // subTimings 계산: 단어 경계에서 sub 분할 시점 산출 — 정본은 lib/align-core.ts
    // (정규화 글자수 누적 + 무음 3/4 지점. 공백 단어 수 방식은 WhisperX 한국어 분절과 어긋난다)
    const words = wordResults[file]
    if (words) {
      for (const seg of timings) {
        const boundaries = computeSubTimings(
          { start: seg.start, end: seg.end, sub: (seg as any).sub as string[] | undefined },
          words,
        )
        if (boundaries) {
          ;(seg as any).subTimings = boundaries
        } else {
          delete (seg as any).subTimings
        }
      }
    }

    // 모든 세그먼트(롱폼·쇼츠 공통) — 숫자 word 타이밍 보정 + 세그먼트 start 당김
    if (words) {
      for (const seg of timings) {
        const segWords = words.filter(w =>
          w.start >= seg.start - 0.05 && w.end <= seg.end + 0.05 && w.text)
        if (segWords.length > 0) {
          ;(seg as any).words = segWords.map(w => ({
            text: w.text,
            start: Math.round(w.start * 1000) / 1000,
            end: Math.round(w.end * 1000) / 1000,
          }))
          // 숫자 word 타이밍 보정 — Whisper가 숫자(예: "1831년" ↔ "천팔백삼십일 년")를
          // 비정상적으로 짧게 잡는 문제. 앞뒤 gap을 흡수해 자연 길이로 확장.
          fixNumericWordTimings((seg as any).words, episode.tts?.replace)
        }
        // 세그먼트 start를 첫 word start에 맞춤 — 자막 페이지 전환 정확도
        if ((seg as any).words?.length > 0) {
          const firstWordStart = (seg as any).words[0].start
          if (seg.start > firstWordStart + 0.05) {
            seg.start = firstWordStart
          }
        }
      }
      // 인접 세그먼트 시간 겹침 제거 — Whisper 단어 정렬이 문장 경계 부근에서 단어를
      // 양쪽 문장에 걸쳐 잡는 경우가 있어 seg[i+1].start < seg[i].end 가 발생할 수 있다.
      // 그대로 두면 BookRecommendShort 의 문단↔자막 매핑이 다음 문장 첫 자막을
      // 이전 문단에 잘못 귀속시켜, 끝 단어 하이라이트가 누락된다.
      for (let i = 1; i < timings.length; i++) {
        if (timings[i].start < timings[i - 1].end) {
          timings[i].start = timings[i - 1].end
          if (timings[i].end < timings[i].start) timings[i].end = timings[i].start + 0.05
        }
      }
    }

    episode.voiceTimings[key] = timings

    // duration 자동 동기화 — voiceTimings의 마지막 end를 duration으로 반영
    const lastEnd = timings[timings.length - 1]?.end
    if (lastEnd == null) continue
    const rounded = Math.round(lastEnd * 100) / 100

    if (file === VN_SERVICE_GREETING) { episode.narrator.serviceGreetingDuration = rounded; continue }
    if (file === VN_SERVICE_INTRO) { episode.narrator.serviceIntroDuration = rounded; continue }
    if (file === VN_CELEB_INTRO) { episode.narrator.celebIntroDuration = rounded; continue }
    if (file === VN_PHILOSOPHY) { episode.host.voiceDuration = rounded; continue }
    if (file === VN_OUTRO) { episode.narrator.outroDuration = rounded; continue }
    if (file === VN_FEATURED_QUOTE) { episode.host.featuredQuoteDuration = rounded; continue }
    if (file === VN_LABEL_SUMMARY && episode.narrator.labelSummaryDuration != null) { episode.narrator.labelSummaryDuration = rounded; continue }
    if (file === VN_LABEL_CONTEXT && episode.narrator.labelContextDuration != null) { episode.narrator.labelContextDuration = rounded; continue }
    if (file === VN_RETURN_INTRO && episode.narrator.returnIntroDuration != null) { episode.narrator.returnIntroDuration = rounded; continue }
    if (file === VN_INTERLUDE && episode.narrator.interludeDuration != null) { episode.narrator.interludeDuration = rounded; continue }

    // D{NN}{letter}{part?}-(title|summary|context).wav — part 없으면 첫 토막(b), b2=두 번째 토막
    const bookMatch = file.match(/^D(\d{2})([a-c])(\d*)-(title|summary|context)\.wav$/)
    if (bookMatch) {
      const idx = parseInt(bookMatch[1]) - 1  // 1-based -> 0-based
      const book = episode.books[idx]
      if (!book) continue
      if (bookMatch[4] === 'title') { book.titleDuration = rounded; continue }
      const isSummary = bookMatch[4] === 'summary'
      const part = bookMatch[3] ? parseInt(bookMatch[3]) - 1 : 0  // 'b2' → 토막 1
      const parts = isSummary
        ? bookFieldParts(book.summary, book.summaryParts)
        : bookFieldParts(book.contextMain, book.contextMainParts)
      const durKey = isSummary ? 'summaryPartDurations' : 'contextPartDurations'
      const totalKey = isSummary ? 'summaryDuration' : 'contextDuration'
      if (parts.length > 1) {
        // 토막별 길이 기록 + 전 토막 확보 시 전체 길이(토막 합 + 재생 간격) 동기화
        const arr: Array<number | undefined> = Array.isArray(book[durKey]) ? [...book[durKey]] : []
        arr.length = parts.length
        if (part < parts.length) arr[part] = rounded
        book[durKey] = arr
        if (arr.every(v => typeof v === 'number')) {
          const total = (arr as number[]).reduce((a, v) => a + v, 0) + FIELD_PART_GAP_SEC * (parts.length - 1)
          book[totalKey] = Math.round(total * 100) / 100
        }
      } else {
        book[totalKey] = rounded
        delete book[durKey]  // 토막 해제 잔존물 제거
      }
      continue
    }
    // D{NN}d{N}{_part?}-(quote|after).wav — quotePairs 동적 배열. _2부터 후속 맥락 토막(0번 토막은 접미사 없음)
    const dMatch = file.match(/^D(\d{2})d(\d+)(?:_(\d+))?-(quote|after)\.wav$/)
    if (dMatch) {
      const idx = parseInt(dMatch[1]) - 1  // 1-based -> 0-based
      if (!episode.books[idx]) continue
      const n = parseInt(dMatch[2])
      const isQuote = dMatch[4] === 'quote'
      const pairIdx = Math.floor((n - 1) / 2) // d1,d2→0  d3,d4→1  d5,d6→2
      if (!episode.books[idx].quotePairs) episode.books[idx].quotePairs = []
      while (episode.books[idx].quotePairs.length <= pairIdx) {
        episode.books[idx].quotePairs.push({})
      }
      const pair = episode.books[idx].quotePairs[pairIdx]
      if (isQuote) {
        pair.quoteDuration = rounded
      } else {
        // 후속 맥락 — 토막 분할 시 토막별 길이 기록 + 전체 길이(토막 합 + 간격) 동기화. summary 토막 패턴과 동일
        const part = dMatch[3] ? parseInt(dMatch[3]) - 1 : 0
        const aParts = bookFieldParts(pair.after, pair.afterParts)
        if (aParts.length > 1) {
          const arr: Array<number | undefined> = Array.isArray(pair.afterPartDurations) ? [...pair.afterPartDurations] : []
          arr.length = aParts.length
          if (part < aParts.length) arr[part] = rounded
          pair.afterPartDurations = arr
          if (arr.every(v => typeof v === 'number')) {
            const total = (arr as number[]).reduce((a, v) => a + v, 0) + FIELD_PART_GAP_SEC * (aParts.length - 1)
            pair.afterDuration = Math.round(total * 100) / 100
          }
        } else {
          pair.afterDuration = rounded
          delete pair.afterPartDurations  // 토막 해제 잔존물 제거
        }
      }
    }

    // 쇼츠 세그먼트 — 옵션 2: 'shorts-{N}/S{NN}-{id}.wav' 형식 (접두사 필수, 1-based)
    const shortMatch = file.match(/^shorts-(\d+)\/S\d{2}-(.+)\.wav$/)
    if (shortMatch && Array.isArray(episode.shorts) && episode.shorts.length > 0) {
      const sShortsIdx1 = parseInt(shortMatch[1]) // 1-based
      const sSegId = shortMatch[2]
      const shortCfg = episode.shorts.find((s: any) => s?._shortsIdx1 === sShortsIdx1)
      const seg = shortCfg?.segments?.find((s: any) => s.id === sSegId)
      if (seg) {
        seg.duration = rounded
        // imageChangeAt.text 앵커 → t 자동 해소 (배열 또는 단일 객체)
        const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : seg.imageChangeAt ? [seg.imageChangeAt] : []

        // 평탄화: word 단위 + sentence 단위 두 목록을 동시에 구축
        // 단일 단어 앵커는 word-level에서 정밀하게, 다단어 앵커는 sentence-level 폴백으로 매칭한다.
        type AnchorPos = { start: number; text: string }
        const flatWords: AnchorPos[] = []
        const flatSents: AnchorPos[] = []
        for (const t of timings) {
          if (t.text) flatSents.push({ start: t.start, text: t.text })
          const tw = (t as any).words as Array<{ start: number; text: string }> | undefined
          if (tw && Array.isArray(tw) && tw.length > 0) {
            for (const w of tw) {
              if (w.text) flatWords.push({ start: w.start, text: w.text })
            }
          }
        }

        // occurrence-aware matching: 같은 anchor의 N번째 등장에 자동 매핑.
        // 단일 단어 앵커: word-level 직접 매칭.
        // 다중 단어 앵커: voiceTimings.words 슬라이딩 윈도우로 시퀀스 매칭 → 첫 단어 start 사용.
        // 실패 시 sentence-level 폴백.
        const findIn = (list: AnchorPos[], text: string, occIdx: number): number | null => {
          let count = 0
          for (const item of list) {
            if (item.text.includes(text)) {
              if (count === occIdx) return item.start
              count++
            }
          }
          return null
        }

        // 다중 단어 앵커 — 토큰 시퀀스가 words 배열 내에서 연속 매칭되는 첫 단어 시작 시각.
        const findWordSequence = (tokens: string[], occIdx: number): number | null => {
          let count = 0
          for (const t of timings) {
            const tw = (t as any).words as Array<{ start: number; text: string }> | undefined
            if (!tw || tw.length < tokens.length) continue
            for (let i = 0; i <= tw.length - tokens.length; i++) {
              let ok = true
              for (let j = 0; j < tokens.length; j++) {
                if (!tw[i + j].text.includes(tokens[j])) { ok = false; break }
              }
              if (ok) {
                if (count === occIdx) return tw[i].start
                count++
              }
            }
          }
          return null
        }

        const occurrence = new Map<string, number>()
        for (const change of changes) {
          if (!change.text) continue
          const occIdx = occurrence.get(change.text) ?? 0
          occurrence.set(change.text, occIdx + 1)

          const tokens = change.text.trim().split(/\s+/).filter(Boolean)
          let matchedStart: number | null = null
          let matchSource: 'word' | 'sentence' = 'word'

          // 1) word-level — 단일 단어는 flatWords, 다중 단어는 words 시퀀스
          if (tokens.length === 1 && flatWords.length > 0) {
            matchedStart = findIn(flatWords, change.text, occIdx)
          } else if (tokens.length > 1) {
            matchedStart = findWordSequence(tokens, occIdx)
          }
          // 2) 실패 시 sentence-level 폴백
          if (matchedStart == null && flatSents.length > 0) {
            matchedStart = findIn(flatSents, change.text, occIdx)
            if (matchedStart != null) matchSource = 'sentence'
          }

          if (matchedStart != null) {
            const resolved = Math.round(matchedStart * 100) / 100
            change.t = resolved
            console.log(`  imageChangeAt "${change.text}" #${occIdx + 1} → ${resolved}s (${matchSource})`)
          } else {
            console.log(`  ⚠ imageChangeAt 앵커 "${change.text}" #${occIdx + 1} 매칭 실패 (본문 등장 횟수 부족)`)
          }
        }
      }
    }
  }

  // timing.json에 저장할 데이터 구성
  // 안전망 — 저장 전 voiceTimings 자동 보정 (음수 duration · 극단 찌부)
  // "analyze가 새로 쓸 때마다 항상 실행" — 사용자가 UI 열기 전에 말 안 되는 값은 없음 보장
  applySafetyNet(episode.voiceTimings as Record<string, any[]>)

  const timingOut: any = { voiceTimings: episode.voiceTimings }

  // narrator duration 추출
  const narratorDurationKeys = [
    'serviceGreetingDuration', 'serviceIntroDuration', 'celebIntroDuration',
    'bridgeDuration', 'outroDuration', 'labelSummaryDuration', 'labelContextDuration',
    'returnIntroDuration', 'prevRecapDuration', 'interludeDuration',
  ]
  const ntd: any = {}
  for (const k of narratorDurationKeys) {
    if (episode.narrator[k] != null) ntd[k] = episode.narrator[k]
  }
  if (Object.keys(ntd).length > 0) timingOut.narrator = ntd

  // host duration 추출
  const htd: any = {}
  if (episode.host.featuredQuoteDuration != null) htd.featuredQuoteDuration = episode.host.featuredQuoteDuration
  if (episode.host.voiceDuration != null) htd.voiceDuration = episode.host.voiceDuration
  if (Object.keys(htd).length > 0) timingOut.host = htd

  // books duration 추출
  const btd = episode.books.map((b: any) => {
    const d: any = {}
    for (const k of ['titleDuration', 'summaryDuration', 'summaryPartDurations', 'contextDuration', 'contextPartDurations']) {
      if (b[k] != null) d[k] = b[k]
    }
    if (b.quotePairs?.length) {
      d.quotePairDurations = b.quotePairs.map((p: any) => {
        const pd: any = {}
        if (p.quoteDuration != null) pd.quoteDuration = p.quoteDuration
        if (p.afterDuration != null) pd.afterDuration = p.afterDuration
        if (p.afterPartDurations != null) pd.afterPartDurations = p.afterPartDurations
        return pd
      })
    }
    return d
  })
  // 신구조: books duration 은 책 폴더별 timing 파일로 분리. 메타에는 timing.books 두지 않는다.
  // 레거시: 본체 timing.json 의 books 배열에 저장.
  if (NEW_LAYOUT) {
    for (let i = 0; i < BOOK_FOLDERS.length; i++) {
      const d = btd[i]
      if (!d || Object.keys(d).length === 0) continue
      const fp = join(episodeDir, 'books', BOOK_FOLDERS[i], `book.${epLocale}.timing.json`)
      writeFileSync(fp, JSON.stringify(d, null, 2) + '\n', 'utf-8')
      console.log(`  ✓ books/${BOOK_FOLDERS[i]}/book.${epLocale}.timing.json`)
    }
  } else if (btd.some((d: any) => Object.keys(d).length > 0)) {
    timingOut.books = btd
  }

  // 옵션 2: 본체 timing.json에는 timing.shorts 저장하지 않는다
  // 쇼츠 duration은 shorts/{locale}-{N}.timing.json 별도 파일로 저장

  // timing.json에 저장 (content JSON은 건드리지 않음)
  writeFileSync(timingPath, JSON.stringify(timingOut, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ ${epName}.timing.json voiceTimings + duration 동기화 완료`)

  // 쇼츠 외부 timing 파일 저장 — shortsIdx(1-based)별로 분리
  // 레거시: shorts/{locale}-{N}.timing.json
  // 신구조: books/{folder}/shorts.{locale}.timing.json
  if (Array.isArray(episode.shorts) && episode.shorts.length > 0) {
    if (!NEW_LAYOUT) mkdirSync(shortsDir, { recursive: true })
    for (const cfg of episode.shorts as any[]) {
      if (!cfg?.segments || !cfg._shortsIdx1) continue
      const shortsIdx1: number = cfg._shortsIdx1
      const segs = cfg.segments.map((s: any) => {
        const d: any = {}
        if (s.duration != null) d.duration = s.duration
        // imageChangeAt 앵커 해소 결과도 외부 파일에 반영
        if (s.imageChangeAt) d.imageChangeAt = s.imageChangeAt
        return d
      })
      const fp = resolveShortsTimingPathFn(shortsIdx1)
      if (!fp) continue
      // 기존 파일 머지 (voiceTimings 등 다른 필드 보존은 현재 분리 안 함, 세그먼트 단위만)
      let existing: any = { segments: [] }
      if (existsSync(fp)) {
        try { existing = JSON.parse(readFileSync(fp, 'utf-8')) } catch { /* corrupt → 덮어쓰기 */ }
      }
      existing.segments = segs
      writeFileSync(fp, JSON.stringify(existing, null, 2) + '\n', 'utf-8')
      const rel = NEW_LAYOUT
        ? `books/${shortsFolderBySlot(shortsIdx1) ?? `<slot-${shortsIdx1}>`}/shorts.${epLocale}.timing.json`
        : `shorts/${epLocale}-${shortsIdx1}.timing.json`
      console.log(`  ✓ ${rel}`)
    }
  }

  // sub 누락 경고 — 임계값은 lib/align-core.ts 단일 원천(5-chunk.ts와 공유)
  const missingSubs: string[] = []
  const oversizedSubs: string[] = []
  for (const [key, segs] of Object.entries(episode.voiceTimings as Record<string, any[]>)) {
    for (let i = 0; i < segs.length; i++) {
      if (!segs[i].sub && (segs[i].text?.length ?? 0) > SUB_MISSING_MIN_LEN) {
        missingSubs.push(`  ${key}[${i}]: (${segs[i].text.length}자) ${segs[i].text.slice(0, 40)}…`)
      }
      if (Array.isArray(segs[i].sub)) {
        (segs[i].sub as string[]).forEach((chunk, j) => {
          if (chunk.length > SUB_MAX_LEN) {
            oversizedSubs.push(`  ${key}[${i}].sub[${j}] (${chunk.length}자): ${chunk.slice(0, 40)}…`)
          }
        })
      }
    }
  }
  if (missingSubs.length > 0) {
    console.warn(`\n⚠ sub 미처리 세그먼트 ${missingSubs.length}건 (${SUB_MISSING_MIN_LEN}자 초과):`)
    missingSubs.forEach(m => console.warn(m))
    console.warn(`→ "sub 채워줘" 또는 pnpm voice:chunk 실행 필요`)
  }
  if (oversizedSubs.length > 0) {
    console.warn(`\n⚠ sub 청크 과대 ${oversizedSubs.length}건 (${SUB_MAX_LEN}자 초과 — 추가 분할 필요):`)
    oversizedSubs.slice(0, 20).forEach(m => console.warn(m))
    if (oversizedSubs.length > 20) console.warn(`  ... 외 ${oversizedSubs.length - 20}건`)
  }

  // 비정상 duration 경고 — 글자수 대비 너무 짧은 세그먼트
  // TTS ~4.5자/초 기준, 글자수 × 0.1s 미만이면 whisper diff 매핑 실패 의심
  const abnormalDurations: string[] = []
  for (const [key, segs] of Object.entries(episode.voiceTimings as Record<string, any[]>)) {
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const text: string = seg.text ?? ''
      const chars = text.replace(/\s/g, '').length
      const duration = (seg.end ?? 0) - (seg.start ?? 0)
      if (chars >= 5 && duration < chars * 0.1) {
        abnormalDurations.push(`  ${key}[${i}]: ${duration.toFixed(2)}s / ${chars}자\n    → ${text}`)
      }
    }
  }
  if (abnormalDurations.length > 0) {
    console.warn(`\n⚠ 비정상 짧은 세그먼트 ${abnormalDurations.length}건 (< 0.1s/자):`)
    abnormalDurations.forEach(m => console.warn(m))
    console.warn(`→ tts.replace 매핑 확인 필요 (docs/project/remotion/book-recommend/voice/tts.md)`)
  }
}

/**
 * 안전망: voiceTimings에서 다음 두 케이스만 자동 복구
 *  (1) 음수 duration (end < start) — Whisper 정렬 실패의 가장 명확한 증상
 *  (2) 극단 찌부 (음절수 대비 50% 미만 + 5자 이상) — 치환 구간 정렬 실패
 *
 * 보정 전략: 다음 세그먼트 start 직전까지 확장 (overflow 방지).
 * 마지막 세그먼트는 음절수 × 130ms 기준으로 확장.
 *
 * 의도적 한계:
 *  - WAV 파형 직접 검출은 하지 않음 (이번 단계는 안전망만)
 *  - 미세 어긋남(±0.5초)은 사용자가 UI에서 손봄
 *  - "확신 있는 명백한 오류"만 건드림
 */
function applySafetyNet(voiceTimings: Record<string, any[]>): void {
  const SEC_PER_SYL = 0.13
  const COMPRESSED_THRESHOLD = 0.5
  const MIN_CHARS_FOR_COMPRESS_CHECK = 5
  let fixedNeg = 0
  let fixedCompressed = 0
  for (const [, segs] of Object.entries(voiceTimings)) {
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const text: string = seg.text ?? ''
      const chars = text.replace(/\s/g, '').length
      const dur = (seg.end ?? 0) - (seg.start ?? 0)
      const expected = chars * SEC_PER_SYL
      const nextStart: number | null = i + 1 < segs.length ? (segs[i + 1].start ?? null) : null
      const cap = nextStart != null ? nextStart - 0.05 : (seg.start ?? 0) + Math.max(0.5, expected)

      if (dur < 0) {
        seg.end = Math.max((seg.start ?? 0) + 0.1, cap)
        fixedNeg++
        continue
      }
      if (chars >= MIN_CHARS_FOR_COMPRESS_CHECK && dur < expected * COMPRESSED_THRESHOLD) {
        const target = Math.min((seg.start ?? 0) + expected, cap)
        if (target > (seg.end ?? 0) + 0.1) {
          seg.end = target
          fixedCompressed++
        }
      }
    }
  }
  if (fixedNeg > 0) console.log(`✓ 안전망: 음수 duration ${fixedNeg}건 자동 복구`)
  if (fixedCompressed > 0) console.log(`✓ 안전망: 극단 찌부 ${fixedCompressed}건 자동 복구 (음절×130ms 기준)`)
}

if (exportDebug && Object.keys(debugTargets).length > 0) {
  const debugData = { episode: epName, locale: episode.locale ?? 'ko', targets: debugTargets }
  const debugPath = join(voiceBaseDir, 'timing-debug.json')
  writeFileSync(debugPath, JSON.stringify(debugData, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ 디버그 데이터: ${debugPath}`)
}

console.log('\n완료.')
