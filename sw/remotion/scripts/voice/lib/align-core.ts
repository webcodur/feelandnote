/**
 * align-core.ts — 음성 정렬 순수 코어. 시리즈 무관(스크립트 전용, Node fs 의존).
 *
 * 파형 파싱·무음 탐지·WhisperX 단어 정렬·구절 경계 보정·숫자 보정·sub 경계(subTimings)
 * 계산 등 "신호처리 + 타이밍 산출" 순수 로직을 모은다. BookRecommend(4-align.ts)와
 * Faction(faction-align.ts) 파이프라인이 공유한다.
 *
 * ⚠ 브라우저 번들에 섞이지 않도록 src/(렌더)가 아니라 scripts/ 하위에 둔다.
 * 정렬 방식은 WhisperX 단어 타이밍 + 파형 보정만 사용한다(forced-align/ASR 단독 재구현 금지).
 */
import { readFileSync } from 'fs'
import { SENTENCE_SPLIT } from '../../../src/compositions/BookRecommend/sentence-split'

export type SentenceTiming = { start: number; end: number; text?: string }
export type WhisperWord = { word: string; start: number; end: number }
export type Silence = { start: number; end: number; center: number }

const r3 = (x: number) => Math.round(x * 1000) / 1000

// --- WAV 파싱 ---
export function parseWav(path: string) {
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
export function detectSilences(path: string, opts: {
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

/** 2-word-timings.json 단어를 세그먼트로 변환. 경계는 실제 단어 end 보존(공백 그대로). */
export function analyzeWithWhisperWords(
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
export function trimWordLeadingSilence(
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
export function mergeIntoPhrases(segments: SentenceTiming[]): SentenceTiming[] {
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
export function adjustPhraseBoundaries(
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
export function fixNumericWordTimings(
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
export function analyzeWithSilence(
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

/**
 * sub 경계 시점(subTimings) 계산 — 한 구절(seg)의 의미 단위 분할(sub)이
 * 실제로 몇 초에 전환되는지를 단어 타이밍에서 산출한다.
 *
 * sub[i]의 단어 수만큼 진행한 지점에서, 직전 단어 끝과 다음 단어 시작의 중점을 경계로 잡는다
 * (다음 단어가 없으면 직전 단어 끝). 단어 수와 sub 경계가 어긋나면 undefined(폴백은 호출 측).
 *
 * @param seg   sub 를 가진 구절(start/end/sub)
 * @param words 이 영상 wav 전체의 단어 타이밍(구절 범위는 내부에서 필터)
 * @returns subTimings(sub.length - 1 개) 또는 계산 불가 시 undefined
 */
export function computeSubTimings(
  seg: { start: number; end: number; sub?: string[] },
  words: { start: number; end: number; text?: string }[],
): number[] | undefined {
  const sub = seg.sub
  if (!sub || sub.length <= 1) return undefined
  // 이 구절에 속하는 단어 세그먼트 수집
  const phraseWords = words.filter(w =>
    w.start >= seg.start - 0.05 && w.end <= seg.end + 0.05 && w.text)
  if (phraseWords.length === 0) return undefined
  // sub별 "글자 수"(공백 제거)를 누적해 경계 단어를 찾는다.
  // WhisperX 한국어 분절은 조사·어미까지 쪼개 공백 단어 수와 어긋나므로(예: 공백 29단어 vs WhisperX 35단어),
  // 단어 수 대신 글자 수 누적으로 경계를 잡아 분절 방식과 무관하게 맞춘다.
  const norm = (s?: string) => (s || '').replace(/[^가-힣a-zA-Z0-9]/g, '')
  const wordCumChars: number[] = []
  let acc = 0
  for (const w of phraseWords) { acc += norm(w.text).length; wordCumChars.push(acc) }
  const boundaries: number[] = []
  let subAcc = 0
  for (let si = 0; si < sub.length - 1; si++) {
    subAcc += norm(sub[si]).length
    let wi = wordCumChars.findIndex(c => c >= subAcc)
    if (wi < 0) wi = phraseWords.length - 1
    const lastWord = phraseWords[wi]
    const nextWord = wi + 1 < phraseWords.length ? phraseWords[wi + 1] : null
    // 경계는 조각 사이 무음의 3/4 지점 — 뒤 조각 시작 쪽에 바짝 붙이되 앞에 1/4 만 리드로 남긴다.
    // (화면 페이지가 다음 대사 시작보다 살짝 먼저 넘어가 읽을 여유를 준다. 중간점(1/2)이면 무음 한복판에 떠 어색.)
    const NEXT_START_BIAS = 0.75
    boundaries.push(nextWord
      ? r3(lastWord.end + (nextWord.start - lastWord.end) * NEXT_START_BIAS)
      : lastWord.end)
  }
  return boundaries.length === sub.length - 1 ? boundaries : undefined
}
