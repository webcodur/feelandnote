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
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath, resolveTimingPath, isNewLayout, loadEpisode } from '../lib/episode.js'

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
// --- 타이밍 분석 ---
type SentenceTiming = { start: number; end: number; text?: string }

type WhisperWord = { word: string; start: number; end: number }

/** 2-word-timings.json 단어를 세그먼트로 변환. 경계는 실제 단어 end 보존(공백 그대로). */
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

  // 단어 원본 end 보존. 첫 단어만 0부터, 마지막 단어만 duration까지 확장.
  // 단어/구절 사이 공백은 데이터에 그대로 남겨 프론트의 Typewriter 보정 로직이
  // 긴 간격(0.5s+)일 때 정확히 페이드아웃하도록 한다.
  segments[0].start = 0
  segments[segments.length - 1].end = duration

  return segments
}

/** 단어 시작점의 선행 무음을 트리밍하여 실제 발화 시작에 맞춤.
 *  2-phase: (1) 이전 단어 잔향을 지나 확실한 무음 구간을 찾고
 *           (2) 거기서부터 실제 발화 시작(RMS 상승)을 탐지 */
function trimWordLeadingSilence(
  segments: SentenceTiming[],
  wavPath: string,
): void {
  const { sampleRate, samples } = parseWav(wavPath)
  const windowSize = Math.round(sampleRate * 0.01) // 10ms
  const silenceFloor = 0.005  // 확실한 무음
  const speechOnset = 0.02    // 발화 시작

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    const startSample = Math.round(seg.start * sampleRate)
    const endSample = Math.round(seg.end * sampleRate)
    const maxScan = Math.min(
      startSample + Math.round((seg.end - seg.start) * 0.7 * sampleRate),
      endSample,
    )

    const rmsAt = (s: number) => {
      let sum = 0
      const wEnd = Math.min(s + windowSize, endSample)
      for (let j = s; j < wEnd; j++) sum += samples[j] * samples[j]
      return Math.sqrt(sum / (wEnd - s))
    }

    // Phase 1: 확실한 무음 구간 탐색 (이전 단어 잔향 통과)
    let silPos = -1
    for (let s = startSample; s < maxScan; s += windowSize) {
      if (rmsAt(s) < silenceFloor) { silPos = s; break }
    }
    if (silPos < 0) continue

    // Phase 2: 무음에서부터 실제 발화 시작 탐색
    let speechPos = -1
    for (let s = silPos; s < maxScan; s += windowSize) {
      if (rmsAt(s) >= speechOnset) {
        speechPos = Math.max(startSample, s - windowSize) // 10ms 여유
        break
      }
    }
    if (speechPos < 0) continue

    // 무음 구간이 300ms 미만이면 정상적인 단어 간 간격이므로 건너뜀
    const silenceDur = (speechPos - silPos) / sampleRate
    if (silenceDur < 0.3) continue

    const trimSec = (speechPos - startSample) / sampleRate
    if (trimSec > 0.05) {
      seg.start = Math.round((speechPos / sampleRate) * 1000) / 1000
    }
  }
}

/** 단어 세그먼트를 구절로 병합. 분절 기준: 문장 종결 구두점(. ! ?)만 사용.
 *  콤마는 세그먼트를 끊지 않는다 — 한 문장은 한 덩어리.
 *  오디오 무음·단어 수 제한 없음 — 문장 내부 분할은 LLM sub이 전담. */
function mergeIntoPhrases(segments: SentenceTiming[]): SentenceTiming[] {
  if (segments.length <= 1) return segments

  const merged: SentenceTiming[] = []
  let pStart = segments[0].start
  let pWords: string[] = []

  for (let i = 0; i < segments.length; i++) {
    pWords.push(segments[i].text ?? '')
    const isLast = i === segments.length - 1

    if (isLast) {
      merged.push({ start: pStart, end: segments[i].end, text: pWords.join(' ') })
      break
    }

    const text = segments[i].text?.trim() ?? ''
    if (/[.!?。][''"」』]?$/.test(text)) {
      merged.push({ start: pStart, end: segments[i].end, text: pWords.join(' ') })
      pStart = segments[i + 1].start
      pWords = []
    }
  }

  return merged
}

/** 구절 경계 보정 — WhisperX가 구절 첫 단어 시작을 늦게 보고하는 경우,
 *  WAV에서 실제 발화 시작점을 역추적하여 경계를 앞당긴다.
 *  예: "1800년을"(천팔백) — WhisperX 15.74s, 실제 발화 15.13s */
function adjustPhraseBoundaries(
  phrases: SentenceTiming[],
  wavPath: string,
): void {
  const { sampleRate, samples } = parseWav(wavPath)
  const windowSize = Math.round(sampleRate * 0.01) // 10ms
  const speechThreshold = 0.015

  for (let i = 1; i < phrases.length; i++) {
    const currentStart = phrases[i].start
    // 직전 구절 끝에서 현재 구절 시작까지 역추적 (최대 1초)
    // 하한을 phrases[i-1].end로 제한 — [i-1] 구간 내부 무음을 [i] 시작점으로
    // 잘못 잡아 [i-1].end를 역전시키는 버그 방지.
    const searchFrom = Math.round(Math.max(phrases[i - 1].end, currentStart - 1.0) * sampleRate)
    const searchTo = Math.round(currentStart * sampleRate)
    if (searchTo - searchFrom < windowSize * 3) continue

    // 역방향 스캔: 현재 시작에서 뒤로 가며 연속 무음(30ms+) 찾기
    // 음절 간 미세 갭(10~20ms)을 무시하고 실제 구절 경계만 감지
    const minSilenceWindows = 5 // 50ms 연속 무음 (음절 간 미세 갭 30ms 이하 무시)
    let silenceEnd = -1
    let silentCount = 0
    for (let s = searchTo - windowSize; s >= searchFrom; s -= windowSize) {
      let sum = 0
      const wEnd = Math.min(s + windowSize, samples.length)
      for (let j = s; j < wEnd; j++) sum += samples[j] * samples[j]
      const rms = Math.sqrt(sum / (wEnd - s))
      if (rms < speechThreshold) {
        silentCount++
        if (silentCount >= minSilenceWindows) {
          // 연속 무음 끝 = 첫 번째 무음 윈도우 + 윈도우 크기
          silenceEnd = s + (silentCount * windowSize)
          break
        }
      } else {
        silentCount = 0
      }
    }
    if (silenceEnd < 0) continue

    const newStartSec = silenceEnd / sampleRate
    const pullbackSec = currentStart - newStartSec
    // 100ms 이상 당길 때만 적용 (미세한 차이는 무시)
    if (pullbackSec < 0.1 || pullbackSec > 1.5) continue

    const newStart = Math.round(newStartSec * 1000) / 1000
    phrases[i].start = newStart
    phrases[i - 1].end = newStart
  }
}

/** 숫자 word 타이밍 보정 — Whisper가 숫자·한글숫자를 비정상적으로 짧게(0.4s 미만) 잡는 문제.
 *  앞뒤 word 사이 gap을 활용해 자연스러운 길이로 확장한다.
 *  tts.replace 매핑이 있으면 실제 발화 텍스트 길이로 정확 추정 (예: "1831년" ↔ "천팔백삼십일 년").
 *  음절당 약 0.18초 가정. */
function fixNumericWordTimings(
  words: { text: string; start: number; end: number }[],
  ttsReplace?: Record<string, string>,
): void {
  const MIN_DUR = 0.4
  const numRe = /^\d|^[천백십만억]/
  const SYLLABLE_DUR = 0.18

  // 단어의 실제 발화 음절 수 추정 (tts.replace 고려)
  const estimateSyllables = (text: string): number => {
    // 1) tts.replace에 정확히 매핑된 키가 있으면 그 길이 사용
    if (ttsReplace) {
      // 단어 자체가 키거나, 단어가 키의 prefix인 경우 찾기
      for (const [k, v] of Object.entries(ttsReplace)) {
        if (text === k || (text.length >= 3 && k.startsWith(text))) {
          return v.replace(/\s+/g, '').length
        }
      }
    }
    // 2) 숫자 → 한국어 음절 대략 변환 (각 자리 ~2음절)
    const digitCount = (text.match(/\d/g) || []).length
    const nonDigit = text.length - digitCount
    return digitCount * 2.2 + nonDigit
  }

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (!numRe.test(w.text)) continue
    const dur = w.end - w.start
    if (dur >= MIN_DUR) continue

    const prev = words[i - 1]
    const next = words[i + 1]
    // 첫 단어(prev 없음)면 앞쪽 확장 여지 없음 — gapBefore=0.
    // 과거: prev ? w.start - prev.end : w.start → 세그먼트 첫 단어에서 start 전체 길이로 오인, 숫자 단어가 세그먼트 경계 앞까지 당겨지는 버그.
    const gapBefore = prev ? w.start - prev.end : 0
    const gapAfter = next ? next.start - w.end : 0

    const syllables = estimateSyllables(w.text)
    const expectedDur = Math.max(0.5, Math.min(2.0, syllables * SYLLABLE_DUR))
    const ratio = dur / expectedDur
    let expandBefore: number
    let expandAfter: number
    if (ratio < 0.4) {
      // Whisper 매핑이 심하게 깨진 경우(실제 발화의 40% 미만): 앞뒤 gap을 최대한 흡수.
      // 단, expectedDur를 cap으로 삼아 과도 확장 방지.
      expandBefore = Math.min(gapBefore * 0.9, expectedDur)
      expandAfter = Math.min(gapAfter * 0.5, expectedDur * 0.3)
    } else {
      const needed = Math.max(0, expectedDur - dur)
      expandBefore = Math.min(gapBefore * 0.8, needed * 0.7)
      expandAfter = Math.min(gapAfter * 0.8, needed * 0.3)
    }

    w.start = Math.round((w.start - expandBefore) * 1000) / 1000
    w.end = Math.round((w.end + expandAfter) * 1000) / 1000
  }
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
  // 각 경계마다 (prevEnd, nextStart) 쌍을 기록 — 침묵 구간에 걸치면 prev는 silence.start, next는 silence.end로 분리
  const boundaryPairs: { prevEnd: number; nextStart: number }[] = []

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
      boundaryPairs.push({ prevEnd: silences[bestIdx].start, nextStart: silences[bestIdx].end })
      usedSilences.add(bestIdx)
    } else {
      boundaryPairs.push({ prevEnd: estimated, nextStart: estimated })
    }
  }

  boundaryPairs.sort((a, b) => a.prevEnd - b.prevEnd)
  const result: SentenceTiming[] = []
  let cursor = 0
  for (const { prevEnd, nextStart } of boundaryPairs) {
    result.push({ start: Math.round(cursor * 1000) / 1000, end: Math.round(prevEnd * 1000) / 1000, text: sentences[result.length] })
    cursor = nextStart
  }
  result.push({ start: Math.round(cursor * 1000) / 1000, end: Math.round(duration * 1000) / 1000, text: sentences[result.length] })
  return result
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
    const afterMatch = textField.match(/^after:(\d+)$/)
    if (afterMatch) return book?.quotePairs?.[parseInt(afterMatch[1])]?.after ?? null
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
    targets.push({ file: vnBookSummary(i), textField: 'summary', bookIndex: i })
    targets.push({ file: vnBookContext(i), textField: 'contextMain', bookIndex: i })
    for (let pi = 0; pi < (episode.books[i].quotePairs?.length ?? 0); pi++) {
      const pair = episode.books[i].quotePairs![pi]
      if (pair.quote) targets.push({ file: vnBookQuote(i, pi), textField: `quote:${pi}`, bookIndex: i })
      if (pair.after) targets.push({ file: vnBookAfter(i, pi), textField: `after:${pi}`, bookIndex: i })
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
    // 기존 sub 보존: 텍스트가 동일한 세그먼트의 sub를 이식
    const oldTimings = episode.voiceTimings[key] as Array<{ text?: string; sub?: string[]; subTimings?: number[] }> | undefined
    if (oldTimings) {
      for (const seg of timings) {
        if (!seg.text) continue
        const old = oldTimings.find((o: { text?: string; sub?: string[] }) => o.text === seg.text && o.sub)
        if (old) (seg as any).sub = old.sub
      }
    }
    // subTimings 계산: 단어 경계에서 sub 분할 시점 산출
    const words = wordResults[file]
    if (words) {
      for (const seg of timings) {
        const sub = (seg as any).sub as string[] | undefined
        if (!sub || sub.length <= 1) { delete (seg as any).subTimings; continue }
        // 이 구절에 속하는 단어 세그먼트 수집
        const phraseWords = words.filter(w =>
          w.start >= seg.start - 0.05 && w.end <= seg.end + 0.05 && w.text)
        if (phraseWords.length === 0) { delete (seg as any).subTimings; continue }
        // sub별 단어 수를 세어 경계 시점 결정
        const boundaries: number[] = []
        let wi = 0
        for (let si = 0; si < sub.length - 1; si++) {
          const subWordCount = sub[si].split(/\s+/).length
          wi += subWordCount
          if (wi > 0 && wi <= phraseWords.length) {
            const lastWord = phraseWords[wi - 1]
            const nextWord = wi < phraseWords.length ? phraseWords[wi] : null
            boundaries.push(nextWord
              ? Math.round(((lastWord.end + nextWord.start) / 2) * 1000) / 1000
              : lastWord.end)
          }
        }
        if (boundaries.length === sub.length - 1) {
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

    // D{NN}{letter}-(title|summary|context).wav
    const bookMatch = file.match(/^D(\d{2})[a-g]-(title|summary|context)\.wav$/)
    if (bookMatch) {
      const idx = parseInt(bookMatch[1]) - 1  // 1-based -> 0-based
      if (!episode.books[idx]) continue
      switch (bookMatch[2]) {
        case 'title': episode.books[idx].titleDuration = rounded; break
        case 'summary': episode.books[idx].summaryDuration = rounded; break
        case 'context': episode.books[idx].contextDuration = rounded; break
      }
      continue
    }
    // D{NN}d{N}-(quote|after).wav — quotePairs 동적 배열
    const dMatch = file.match(/^D(\d{2})d(\d+)-(quote|after)\.wav$/)
    if (dMatch) {
      const idx = parseInt(dMatch[1]) - 1  // 1-based -> 0-based
      if (!episode.books[idx]) continue
      const n = parseInt(dMatch[2])
      const isQuote = dMatch[3] === 'quote'
      const pairIdx = Math.floor((n - 1) / 2) // d1,d2→0  d3,d4→1  d5,d6→2
      if (!episode.books[idx].quotePairs) episode.books[idx].quotePairs = []
      while (episode.books[idx].quotePairs.length <= pairIdx) {
        episode.books[idx].quotePairs.push({})
      }
      if (isQuote) episode.books[idx].quotePairs[pairIdx].quoteDuration = rounded
      else episode.books[idx].quotePairs[pairIdx].afterDuration = rounded
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
    for (const k of ['titleDuration', 'summaryDuration', 'contextDuration']) {
      if (b[k] != null) d[k] = b[k]
    }
    if (b.quotePairs?.length) {
      d.quotePairDurations = b.quotePairs.map((p: any) => {
        const pd: any = {}
        if (p.quoteDuration != null) pd.quoteDuration = p.quoteDuration
        if (p.afterDuration != null) pd.afterDuration = p.afterDuration
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

  // sub 누락 경고
  const missingSubs: string[] = []
  const oversizedSubs: string[] = []
  const MAX_SUB_CHUNK_LEN = 35
  for (const [key, segs] of Object.entries(episode.voiceTimings as Record<string, any[]>)) {
    for (let i = 0; i < segs.length; i++) {
      if (!segs[i].sub && (segs[i].text?.length ?? 0) > 30) {
        missingSubs.push(`  ${key}[${i}]: (${segs[i].text.length}자) ${segs[i].text.slice(0, 40)}…`)
      }
      if (Array.isArray(segs[i].sub)) {
        (segs[i].sub as string[]).forEach((chunk, j) => {
          if (chunk.length > MAX_SUB_CHUNK_LEN) {
            oversizedSubs.push(`  ${key}[${i}].sub[${j}] (${chunk.length}자): ${chunk.slice(0, 40)}…`)
          }
        })
      }
    }
  }
  if (missingSubs.length > 0) {
    console.warn(`\n⚠ sub 미처리 세그먼트 ${missingSubs.length}건:`)
    missingSubs.forEach(m => console.warn(m))
    console.warn(`→ "sub 채워줘" 또는 pnpm voice:chunk 실행 필요`)
  }
  if (oversizedSubs.length > 0) {
    console.warn(`\n⚠ sub 청크 과대 ${oversizedSubs.length}건 (${MAX_SUB_CHUNK_LEN}자 초과 — 추가 분할 필요):`)
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
