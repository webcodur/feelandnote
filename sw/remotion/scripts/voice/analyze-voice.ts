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
import { join } from 'path'
import { SENTENCE_SPLIT } from '../../src/compositions/BookRecommend/sentence-split'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO,
  VN_CELEB_INTRO, VN_PHILOSOPHY, VN_OUTRO, VN_FEATURED_QUOTE,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  VN_RETURN_INTRO, VN_INTERLUDE,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter, vnBookQuote2, vnBookContextAfter2,
  vnShort, vnTimingKey, resolveVoiceRelPath,
} from '../../src/compositions/BookRecommend/voice-names'
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath, resolveTimingPath } from '../lib/episode.js'

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

  // 경계 = 다음 단어의 시작 시점 (무음 구간은 이전 단어에 귀속)
  segments[0].start = 0
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].end = segments[i + 1].start
  }
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

/** 단어 세그먼트를 구절로 병합. 분절 기준: 구두점(, . ! ?)만 사용.
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
    if (/[,.!?。，！？]$/.test(text)) {
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
    const searchFrom = Math.round(Math.max(0, currentStart - 1.0) * sampleRate)
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
    case 'featuredQuote': return episode.host.featuredQuote
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

// --- CLI ---
const args = process.argv.slice(2)

// 허용 플래그 검증 — 오타·미지원 플래그 유입 방지
const KNOWN_FLAGS = new Set(['--episode', '--only', '--shorts', '--long', '--update-json', '--export-debug'])
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
const shortsOnly = args.includes('--shorts')
const longOnly = args.includes('--long')
const updateJson = args.includes('--update-json')
const exportDebug = args.includes('--export-debug')

if (!epName) {
  console.error('Usage: pnpm analyze -- --episode <name> [--only file1,file2] [--shorts] [--long] [--update-json] [--export-debug]')
  process.exit(1)
}

const { person: epPerson, locale: epLocale } = parseEpName(epName)
const voiceBaseDir = join(findEpisodeDir(epPerson), 'voice', epLocale)
// voice-select.json이 있으면 엔진 하위 디렉토리 사용
let voiceSelect: { default: string; slots?: Record<string, string> } | null = null
try {
  voiceSelect = JSON.parse(readFileSync(join(voiceBaseDir, 'voice-select.json'), 'utf-8'))
} catch { /* voice-select 없으면 null */ }
const epPath = resolveEpisodePath(epName)
const timingPath = resolveTimingPath(epName)
const episode = JSON.parse(readFileSync(epPath, 'utf-8'))
let timing: any = {}
try { timing = JSON.parse(readFileSync(timingPath, 'utf-8')) } catch { /* 신규 에피소드 */ }

// voiceTimings를 episode에 합침 (기존 코드 호환)
if (timing.voiceTimings) episode.voiceTimings = timing.voiceTimings
// duration도 합침
if (timing.narrator) Object.assign(episode.narrator, timing.narrator)
if (timing.host) Object.assign(episode.host, timing.host)
if (timing.books) {
  timing.books.forEach((bt: any, i: number) => {
    if (episode.books[i]) Object.assign(episode.books[i], bt)
  })
}
if (timing.shorts?.segments) {
  timing.shorts.segments.forEach((st: any, i: number) => {
    if (episode.shorts?.segments?.[i]) Object.assign(episode.shorts.segments[i], st)
  })
}

// 분석 대상
type Target = { file: string; textField: string; bookIndex?: number }
const targets: Target[] = []

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
  targets.push({ file: vnBookContext(i), textField: 'context', bookIndex: i })
  if (episode.books[i].directQuote) {
    targets.push({ file: vnBookQuote(i), textField: 'directQuote', bookIndex: i })
  }
  if (episode.books[i].contextAfter) {
    targets.push({ file: vnBookContextAfter(i), textField: 'contextAfter', bookIndex: i })
  }
  if (episode.books[i].directQuote2) {
    targets.push({ file: vnBookQuote2(i), textField: 'directQuote2', bookIndex: i })
  }
  if (episode.books[i].contextAfter2) {
    targets.push({ file: vnBookContextAfter2(i), textField: 'contextAfter2', bookIndex: i })
  }
}

if (episode.shorts?.segments) {
  let si = 0
  for (const seg of episode.shorts.segments as Array<{ id: string; visual?: string }>) {
    if (seg.id === 'cta') { si++; continue }
    targets.push({ file: vnShort(si, seg.id), textField: `short-${seg.id}` })
    si++
  }
}

const filtered = shortsOnly
  ? targets.filter(t => t.file.startsWith('S'))
  : longOnly
  ? targets.filter(t => !t.file.startsWith('S'))
  : onlyFilter
  ? targets.filter(t => onlyFilter.some(f => t.file.includes(f)))
  : targets

console.log(`에피소드: ${epName}`)
console.log(`${filtered.length}개 파일 분석 (텍스트+파형 결합)\n`)

const results: Record<string, SentenceTiming[]> = {}
const wordResults: Record<string, SentenceTiming[]> = {} // sub 경계 계산용
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
  const { dir, subPath } = resolveVoiceRelPath(target.file, voiceSelect, locale, !!episode.host?.elevenlabsVoiceId)
  const commonLocale = episode.locale === 'en' ? 'en' : 'ko'
  const wavPath = dir === 'common'
    ? join(ROOT, 'public', 'common', 'voice', commonLocale, subPath)
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

    // 쇼츠 imageChangeAt anchor의 word-level 매칭용 — segment 내 단어 타이밍 첨부
    // 같은 sentence에 여러 anchor가 있을 때 단어 위치로 구분 가능하게 함
    const shortMatchForWords = file.match(/^S\d{2}-(.+)\.wav$/)
    if (shortMatchForWords && words && episode.shorts?.segments) {
      const shortSeg = episode.shorts.segments.find((s: any) => s.id === shortMatchForWords[1])
      const hasImageChangeAt = shortSeg && (Array.isArray(shortSeg.imageChangeAt) ? shortSeg.imageChangeAt.length > 0 : !!shortSeg.imageChangeAt)
      if (hasImageChangeAt) {
        for (const seg of timings) {
          const segWords = words.filter(w =>
            w.start >= seg.start - 0.05 && w.end <= seg.end + 0.05 && w.text)
          if (segWords.length > 0) {
            ;(seg as any).words = segWords.map(w => ({
              text: w.text,
              start: Math.round(w.start * 1000) / 1000,
              end: Math.round(w.end * 1000) / 1000,
            }))
          }
        }
      }
    }

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

    const bookMatch = file.match(/^D(\d{2})[a-g]-(title|summary|context|quote|context-after|quote2|context-after2)\.wav$/)
    if (bookMatch) {
      const idx = parseInt(bookMatch[1]) - 1  // 1-based -> 0-based
      if (!episode.books[idx]) continue
      switch (bookMatch[2]) {
        case 'title': episode.books[idx].titleDuration = rounded; break
        case 'summary': episode.books[idx].summaryDuration = rounded; break
        case 'context': episode.books[idx].contextDuration = rounded; break
        case 'quote': episode.books[idx].quoteDuration = rounded; break
        case 'context-after': episode.books[idx].contextAfterDuration = rounded; break
        case 'quote2': episode.books[idx].quoteDuration2 = rounded; break
        case 'context-after2': episode.books[idx].contextAfterDuration2 = rounded; break
      }
    }

    // 쇼츠 V1 세그먼트
    const shortMatch = file.match(/^S\d{2}-(.+)\.wav$/)
    if (shortMatch && episode.shorts?.segments) {
      const seg = episode.shorts.segments.find((s: any) => s.id === shortMatch[1])
      if (seg) {
        seg.duration = rounded
        // imageChangeAt.text 앵커 → t 자동 해소 (배열 또는 단일 객체)
        const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : seg.imageChangeAt ? [seg.imageChangeAt] : []
        for (const change of changes) {
          if (change.text && timings.length > 0) {
            const match = timings.find((t: any) => t.text?.includes(change.text))
            if (match) {
              const resolved = Math.round(match.start * 100) / 100
              change.t = resolved
              console.log(`  imageChangeAt "${change.text}" → ${resolved}s`)
            } else {
              console.log(`  ⚠ imageChangeAt 앵커 "${change.text}" 매칭 실패`)
            }
          }
        }
      }
    }
  }

  // timing.json에 저장할 데이터 구성
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
    for (const k of ['titleDuration', 'summaryDuration', 'contextDuration', 'quoteDuration', 'contextAfterDuration', 'quoteDuration2', 'contextAfterDuration2']) {
      if (b[k] != null) d[k] = b[k]
    }
    return d
  })
  if (btd.some((d: any) => Object.keys(d).length > 0)) timingOut.books = btd

  // shorts duration 추출
  if (episode.shorts?.segments) {
    const std = episode.shorts.segments.map((s: any) => {
      const d: any = {}
      if (s.duration != null) d.duration = s.duration
      return d
    })
    if (std.some((d: any) => Object.keys(d).length > 0)) {
      timingOut.shorts = { segments: std }
    }
  }

  // timing.json에 저장 (content JSON은 건드리지 않음)
  writeFileSync(timingPath, JSON.stringify(timingOut, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ ${epName}.timing.json voiceTimings + duration 동기화 완료`)

  // sub 누락 경고
  const missingSubs: string[] = []
  for (const [key, segs] of Object.entries(episode.voiceTimings as Record<string, any[]>)) {
    for (let i = 0; i < segs.length; i++) {
      if (!segs[i].sub && (segs[i].text?.length ?? 0) > 30) {
        missingSubs.push(`  ${key}[${i}]: (${segs[i].text.length}자) ${segs[i].text.slice(0, 40)}…`)
      }
    }
  }
  if (missingSubs.length > 0) {
    console.warn(`\n⚠ sub 미처리 세그먼트 ${missingSubs.length}건:`)
    missingSubs.forEach(m => console.warn(m))
    console.warn(`→ "sub 채워줘" 또는 pnpm sub:apply 실행 필요`)
  }
}

if (exportDebug && Object.keys(debugTargets).length > 0) {
  const debugData = { episode: epName, locale: episode.locale ?? 'ko', targets: debugTargets }
  const debugPath = join(voiceBaseDir, 'timing-debug.json')
  writeFileSync(debugPath, JSON.stringify(debugData, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ 디버그 데이터: ${debugPath}`)
}

console.log('\n완료.')
