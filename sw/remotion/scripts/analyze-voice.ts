/**
 * analyze-voice.ts — 단어 단위 voiceTimings 생성 + duration 동기화
 *
 * whisper-debug.json의 단어별 타임스탬프를 voiceTimings에 직접 저장한다.
 * whisper-debug.json이 없으면 SENTENCE_SPLIT + RMS 폴백.
 *
 * Usage:
 *   pnpm analyze -- --episode alexander-the-great --update-json
 *   pnpm analyze -- --episode alexander-the-great --update-json --export-debug
 *   pnpm analyze -- --episode alexander-the-great --only book-0-context
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { SENTENCE_SPLIT } from '../src/compositions/BookRecommend/sentence-split'
import { fileURLToPath } from 'url'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO,
  VN_CELEB_INTRO, VN_PHILOSOPHY, VN_OUTRO, VN_FEATURED_QUOTE,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  VN_RETURN_INTRO, VN_INTERLUDE,
  vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter,
  vnShort, vnTimingKey, resolveVoiceRelPath,
} from '../src/compositions/BookRecommend/voice-names'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// --- WAV 파싱 ---
function parseWav(path: string) {
  const buf = readFileSync(path)
  const sampleRate = buf.readUInt32LE(24)
  const bitsPerSample = buf.readUInt16LE(34)

  let pos = 12
  while (pos < buf.length - 8) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'data') {
      const dataStart = pos + 8
      const numSamples = size / (bitsPerSample / 8)
      const samples = new Float32Array(numSamples)
      if (bitsPerSample === 16) {
        for (let i = 0; i < numSamples; i++) {
          samples[i] = buf.readInt16LE(dataStart + i * 2) / 32768
        }
      }
      return { sampleRate, samples }
    }
    pos += 8 + size
  }
  throw new Error(`No data chunk in ${path}`)
}

// --- 무음 구간 탐지 ---
type Silence = { start: number; end: number; center: number }

function detectSilences(path: string, opts: {
  windowSec?: number
  threshold?: number
  minSilenceSec?: number
} = {}): { duration: number; silences: Silence[] } {
  const { windowSec = 0.02, threshold = 0.015, minSilenceSec = 0.2 } = opts
  const { sampleRate, samples } = parseWav(path)
  const windowSize = Math.round(sampleRate * windowSec)
  const duration = samples.length / sampleRate

  // RMS per window
  const rms: number[] = []
  for (let i = 0; i < samples.length; i += windowSize) {
    let sum = 0
    const end = Math.min(i + windowSize, samples.length)
    for (let j = i; j < end; j++) sum += samples[j] * samples[j]
    rms.push(Math.sqrt(sum / (end - i)))
  }

  // 무음 구간 병합
  const silences: Silence[] = []
  let silStart = -1
  for (let i = 0; i <= rms.length; i++) {
    const isSilent = i < rms.length ? rms[i] < threshold : false
    if (isSilent && silStart < 0) {
      silStart = i
    } else if (!isSilent && silStart >= 0) {
      const start = silStart * windowSec
      const end = i * windowSec
      if (end - start >= minSilenceSec) {
        silences.push({ start, end, center: (start + end) / 2 })
      }
      silStart = -1
    }
  }

  return { duration, silences }
}

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

/** TTS voiceStyle 태그·trailing 무음 마커를 제거하여 화면 텍스트 기준 분할을 보장 */
function stripTtsTags(text: string): string {
  return text.replace(/^\[.*?\]\s*/, '').replace(/\s*\.{3}\s*\.{3}\s*$/, '').trim()
}

// --- 타이밍 분석 ---
type SentenceTiming = { start: number; end: number; text?: string }

type WhisperWord = { word: string; start: number; end: number }

/** whisper-debug.json 단어를 세그먼트로 변환. 경계는 무음 구간 중앙. */
function analyzeWithWhisperWords(
  whisperWords: WhisperWord[],
  duration: number,
): SentenceTiming[] {
  if (whisperWords.length === 0) return []

  const segments: SentenceTiming[] = whisperWords.map(w => ({
    start: w.start,
    end: w.end,
    text: w.word,
  }))

  // 경계 = 이전 단어 끝 ↔ 다음 단어 시작의 중앙 (무음 구간 한가운데서 전환)
  segments[0].start = 0
  const mids: number[] = []
  for (let i = 0; i < segments.length - 1; i++) {
    mids.push(Math.round(((segments[i].end + segments[i + 1].start) / 2) * 1000) / 1000)
  }
  for (let i = 0; i < mids.length; i++) {
    segments[i].end = mids[i]
    segments[i + 1].start = mids[i]
  }
  segments[segments.length - 1].end = duration

  return segments
}

/** SENTENCE_SPLIT 폴백 — Whisper 데이터 없을 때 사용 */
function analyzeWithSilence(
  wavPath: string,
  text: string,
): SentenceTiming[] {
  const sentences = text.split(SENTENCE_SPLIT).filter(Boolean)
  const { duration, silences } = detectSilences(wavPath)
  const needed = sentences.length - 1

  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
  const estimatedBoundaries: number[] = []
  let charCursor = 0
  for (let i = 0; i < needed; i++) {
    charCursor += sentences[i].length
    estimatedBoundaries.push((charCursor / totalChars) * duration)
  }

  const usedSilences = new Set<number>()
  const boundaries: number[] = []

  for (const estimated of estimatedBoundaries) {
    let bestIdx = -1
    let bestDist = Infinity
    for (let si = 0; si < silences.length; si++) {
      if (usedSilences.has(si)) continue
      const dist = Math.abs(silences[si].center - estimated)
      if (dist < bestDist) { bestDist = dist; bestIdx = si }
    }
    const isEdgeSilence = bestIdx >= 0 && (silences[bestIdx].end < 0.5 || silences[bestIdx].start > duration - 0.5)
    if (bestIdx >= 0 && !isEdgeSilence && bestDist < duration * 0.25) {
      boundaries.push(silences[bestIdx].start)
      usedSilences.add(bestIdx)
    } else {
      boundaries.push(estimated)
    }
  }

  boundaries.sort((a, b) => a - b)
  const result: SentenceTiming[] = []
  let cursor = 0
  for (const boundary of boundaries) {
    result.push({ start: Math.round(cursor * 1000) / 1000, end: Math.round(boundary * 1000) / 1000, text: sentences[result.length] })
    cursor = boundary
  }
  result.push({ start: Math.round(cursor * 1000) / 1000, end: Math.round(duration * 1000) / 1000, text: sentences[result.length] })
  return result
}

// --- 텍스트 조회 ---
/** 화면 표시용 텍스트 (TTS 오버라이드 무시). 문장 분할 기준으로 사용 */
function getDisplayText(episode: any, textField: string, bookIndex?: number): string | null {
  if (bookIndex !== undefined) {
    const book = episode.books[bookIndex]
    return book?.[textField] ?? null
  }
  switch (textField) {
    case 'celebIntro': return episode.narrator.celebIntro
    case 'philosophy': return episode.host.philosophy
    case 'outro': return episode.narrator.outro
    case 'serviceGreeting': return episode.narrator.serviceGreeting
    case 'serviceIntro': return episode.narrator.serviceIntro
    default:
      if (textField.startsWith('short-')) {
        const segId = textField.replace('short-', '')
        const seg = episode.shorts?.segments?.find((s: any) => s.id === segId)
        return seg?.text ?? null
      }
      return null
  }
}

/** TTS용 텍스트 (오버라이드 우선). 오디오와의 대응 확인용 */
function getTextForTarget(episode: any, textField: string, bookIndex?: number): string | null {
  if (bookIndex !== undefined) {
    const book = episode.books[bookIndex]
    if (!book) return null
    // TTS 오버라이드 우선
    const ttsBook = episode.tts?.books?.[bookIndex]
    return ttsBook?.[textField] ?? book[textField] ?? null
  }
  // narrator/host
  const ttsNarrator = episode.tts?.narrator
  const ttsHost = episode.tts?.host
  switch (textField) {
    case 'celebIntro': return ttsNarrator?.celebIntro ?? episode.narrator.celebIntro
    case 'philosophy': return ttsHost?.philosophy ?? episode.host.philosophy
    case 'outro': return ttsNarrator?.outro ?? episode.narrator.outro
    case 'serviceGreeting': return ttsNarrator?.serviceGreeting ?? episode.narrator.serviceGreeting
    case 'serviceIntro': return ttsNarrator?.serviceIntro ?? episode.narrator.serviceIntro
    default:
      // shorts segments
      if (textField.startsWith('short-')) {
        const segId = textField.replace('short-', '')
        const seg = episode.shorts?.segments?.find((s: any) => s.id === segId)
        return seg?.text ?? null
      }
      // serviceGreeting parts
      if (textField.startsWith('serviceGreeting-')) {
        const idx = parseInt(textField.split('-')[1])
        return episode.narrator.serviceGreetingParts?.[idx]?.text ?? null
      }
      return null
  }
}

// --- CLI ---
const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null
const onlyIdx = args.indexOf('--only')
const onlyFilter = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null
const updateJson = args.includes('--update-json')
const exportDebug = args.includes('--export-debug')

if (!epName) {
  console.error('Usage: pnpm analyze -- --episode <name> [--only file1,file2] [--update-json] [--export-debug]')
  process.exit(1)
}

const voiceBaseDir = join(__dirname, '..', 'public', 'voice', epName)
// voice-select.json이 있으면 엔진 하위 디렉토리 사용
let voiceSelect: { default: string; slots?: Record<string, string> } | null = null
try {
  voiceSelect = JSON.parse(readFileSync(join(voiceBaseDir, 'voice-select.json'), 'utf-8'))
} catch { /* voice-select 없으면 null */ }
const epPath = join(__dirname, '..', 'episodes', 'book-recommend', `${epName}.json`)
const episode = JSON.parse(readFileSync(epPath, 'utf-8'))

// 분석 대상
type Target = { file: string; textField: string; bookIndex?: number }
const targets: Target[] = []

if (episode.narrator.serviceGreeting) {
  targets.push({ file: VN_SERVICE_GREETING, textField: 'serviceGreeting' })
}
targets.push({ file: VN_SERVICE_INTRO, textField: 'serviceIntro' })
targets.push({ file: VN_CELEB_INTRO, textField: 'celebIntro' })
targets.push({ file: VN_PHILOSOPHY, textField: 'philosophy' })
targets.push({ file: VN_OUTRO, textField: 'outro' })

for (let i = 0; i < episode.books.length; i++) {
  targets.push({ file: vnBookSummary(i), textField: 'summary', bookIndex: i })
  targets.push({ file: vnBookContext(i), textField: 'context', bookIndex: i })
  if (episode.books[i].directQuote) {
    targets.push({ file: vnBookQuote(i), textField: 'directQuote', bookIndex: i })
  }
  if (episode.books[i].contextAfter) {
    targets.push({ file: vnBookContextAfter(i), textField: 'contextAfter', bookIndex: i })
  }
}

if (episode.shorts?.segments) {
  let si = 0
  for (const seg of episode.shorts.segments as Array<{ id: string; visual?: string }>) {
    targets.push({ file: vnShort(si, seg.id), textField: `short-${seg.id}` })
    si++
  }
}

const filtered = onlyFilter
  ? targets.filter(t => onlyFilter.some(f => t.file.includes(f)))
  : targets

console.log(`에피소드: ${epName}`)
console.log(`${filtered.length}개 파일 분석 (텍스트+파형 결합)\n`)

const results: Record<string, SentenceTiming[]> = {}
const debugTargets: Record<string, any> = {}

// Whisper 데이터 로드 (있으면 갭 기반 우선)
let whisperData: Record<string, WhisperWord[]> = {}
try {
  const whisperPath = join(voiceBaseDir, 'whisper-debug.json')
  const raw = JSON.parse(readFileSync(whisperPath, 'utf-8'))
  whisperData = raw.targets ?? raw
} catch { /* whisper 없으면 폴백 */ }
const hasWhisper = Object.keys(whisperData).length > 0
console.log(hasWhisper ? '단어 단위 매핑 (whisperx + diff)' : 'Whisper 없음 — SENTENCE_SPLIT 폴백')

for (const target of filtered) {
  const locale = episode.locale === 'en' ? 'en' as const : 'ko' as const
  const { dir, subPath } = resolveVoiceRelPath(target.file, voiceSelect, locale)
  const wavPath = dir === 'common'
    ? join(__dirname, '..', 'public', 'voice', 'common', subPath)
    : join(voiceBaseDir, subPath)
  const displayText = getDisplayText(episode, target.textField, target.bookIndex)

  if (!displayText) {
    console.log(`[${target.file}] 텍스트 없음 — 건너뜀`)
    continue
  }

  try {
    const whisperKey = vnTimingKey(target.file)
    const whisperWords = whisperData[whisperKey] ?? whisperData[target.file]
    const { duration } = detectSilences(wavPath)

    const timings = whisperWords
      ? analyzeWithWhisperWords(whisperWords, duration)
      : analyzeWithSilence(wavPath, displayText)

    results[target.file] = timings

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
        sentences, draft: timings,
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
    episode.voiceTimings[key] = timings

    // duration 자동 동기화 — voiceTimings의 마지막 end를 duration으로 반영
    const lastEnd = timings[timings.length - 1]?.end
    if (lastEnd == null) continue
    const rounded = Math.round(lastEnd * 100) / 100

    if (file === VN_SERVICE_GREETING) { episode.narrator.serviceGreetingDuration = rounded; continue }
    if (file === VN_SERVICE_INTRO && episode.narrator.serviceIntroDuration != null) { episode.narrator.serviceIntroDuration = rounded; continue }
    if (file === VN_CELEB_INTRO) { episode.narrator.celebIntroDuration = rounded; continue }
    if (file === VN_PHILOSOPHY) { episode.host.voiceDuration = rounded; continue }
    if (file === VN_OUTRO) { episode.narrator.outroDuration = rounded; continue }
    if (file === VN_FEATURED_QUOTE) { episode.host.featuredQuoteDuration = rounded; continue }
    if (file === VN_LABEL_SUMMARY && episode.narrator.labelSummaryDuration != null) { episode.narrator.labelSummaryDuration = rounded; continue }
    if (file === VN_LABEL_CONTEXT && episode.narrator.labelContextDuration != null) { episode.narrator.labelContextDuration = rounded; continue }
    if (file === VN_RETURN_INTRO && episode.narrator.returnIntroDuration != null) { episode.narrator.returnIntroDuration = rounded; continue }
    if (file === VN_INTERLUDE && episode.narrator.interludeDuration != null) { episode.narrator.interludeDuration = rounded; continue }

    const bookMatch = file.match(/^D(\d{2})[a-e]-(title|summary|context|quote|context-after)\.wav$/)
    if (bookMatch) {
      const idx = parseInt(bookMatch[1]) - 1  // 1-based -> 0-based
      if (!episode.books[idx]) continue
      switch (bookMatch[2]) {
        case 'title': episode.books[idx].titleDuration = rounded; break
        case 'summary': episode.books[idx].summaryDuration = rounded; break
        case 'context': episode.books[idx].contextDuration = rounded; break
        case 'quote': episode.books[idx].quoteDuration = rounded; break
        case 'context-after': episode.books[idx].contextAfterDuration = rounded; break
      }
    }

    // 쇼츠 세그먼트
    const shortMatch = file.match(/^S\d{2}-(.+)\.wav$/)
    if (shortMatch && episode.shorts?.segments) {
      const seg = episode.shorts.segments.find((s: any) => s.id === shortMatch[1])
      if (seg) seg.duration = rounded
    }
  }

  writeFileSync(epPath, JSON.stringify(episode, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ ${epName}.json voiceTimings + duration 동기화 완료`)
}

if (exportDebug && Object.keys(debugTargets).length > 0) {
  const debugData = { episode: epName, locale: episode.locale ?? 'ko', targets: debugTargets }
  const debugPath = join(voiceBaseDir, 'timing-debug.json')
  writeFileSync(debugPath, JSON.stringify(debugData, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ 디버그 데이터: ${debugPath}`)
}

console.log('\n완료.')
