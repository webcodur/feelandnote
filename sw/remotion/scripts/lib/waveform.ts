/**
 * waveform.ts — WAV 파형 RMS 에너지 기반 발음 구간 검출 공용 유틸
 *
 * 사용처:
 *   - 4-align.ts 안전망 (음수 duration·극단 찌부 자동 복구)
 *   - UI VoicePipelineStatus 패널 (필요 시 server-side API 경유)
 *
 * 원칙: WAV 표준 PCM (16/32-bit) 직접 파싱 — 외부 의존 없음.
 */
import { readFileSync } from 'fs'

export type SpeechSegment = { start: number; end: number }
export type Wave = { sampleRate: number; samples: Float32Array }

/**
 * RIFF/WAVE 표준 PCM 파일을 모노 float32(-1.0 ~ 1.0) 배열로 로드.
 * 다채널은 평균으로 모노화.
 */
export function loadWavMono(path: string): Wave {
  const buf = readFileSync(path)
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error(`not RIFF: ${path}`)
  if (buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`not WAVE: ${path}`)

  let pos = 12
  let sampleRate = 0
  let bitsPerSample = 0
  let numChannels = 0

  while (pos < buf.length - 8) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'fmt ') {
      numChannels = buf.readUInt16LE(pos + 10)
      sampleRate = buf.readUInt32LE(pos + 12)
      bitsPerSample = buf.readUInt16LE(pos + 22)
    } else if (id === 'data') {
      const dataStart = pos + 8
      const sampleSize = bitsPerSample / 8
      const totalFrames = Math.floor(size / (sampleSize * numChannels))
      const out = new Float32Array(totalFrames)
      const maxVal = bitsPerSample === 16 ? 0x7fff : (bitsPerSample === 32 ? 0x7fffffff : 0x7f)
      for (let i = 0; i < totalFrames; i++) {
        let sum = 0
        for (let c = 0; c < numChannels; c++) {
          const offset = dataStart + (i * numChannels + c) * sampleSize
          let v: number
          if (bitsPerSample === 16) v = buf.readInt16LE(offset)
          else if (bitsPerSample === 32) v = buf.readInt32LE(offset)
          else v = buf.readInt8(offset)
          sum += v / maxVal
        }
        out[i] = sum / numChannels
      }
      return { sampleRate, samples: out }
    }
    pos += 8 + size
  }
  throw new Error(`no 'data' chunk: ${path}`)
}

/**
 * RMS 에너지 기반 발음 구간(speech segment) 검출.
 *
 * @param samples 모노 float32 PCM
 * @param sampleRate 샘플레이트 (Hz)
 * @param opts.thresholdRatio peak 대비 임계 비율 (default 0.04)
 * @param opts.minGapMs 이 미만의 무음은 인접 구간으로 병합 (default 80ms — 단어 사이 호흡)
 * @param opts.windowMs RMS 계산 window (default 10ms)
 */
export function detectSpeechSegments(
  samples: Float32Array,
  sampleRate: number,
  opts: { thresholdRatio?: number; minGapMs?: number; windowMs?: number } = {},
): SpeechSegment[] {
  const thresholdRatio = opts.thresholdRatio ?? 0.04
  const minGapMs = opts.minGapMs ?? 80
  const windowMs = opts.windowMs ?? 10
  const winSize = Math.max(1, Math.floor(sampleRate * windowMs / 1000))
  const numWin = Math.floor(samples.length / winSize)
  if (numWin === 0) return []

  const rms = new Float32Array(numWin)
  let peak = 0
  for (let w = 0; w < numWin; w++) {
    let sum = 0
    for (let i = 0; i < winSize; i++) {
      const v = samples[w * winSize + i]
      sum += v * v
    }
    const r = Math.sqrt(sum / winSize)
    rms[w] = r
    if (r > peak) peak = r
  }
  if (peak === 0) return []

  const threshold = peak * thresholdRatio
  const step = windowMs / 1000
  const segments: SpeechSegment[] = []
  let inSeg = false
  let segStart = 0
  for (let w = 0; w < numWin; w++) {
    if (rms[w] > threshold) {
      if (!inSeg) { inSeg = true; segStart = w }
    } else if (inSeg) {
      inSeg = false
      segments.push({ start: segStart * step, end: w * step })
    }
  }
  if (inSeg) segments.push({ start: segStart * step, end: numWin * step })

  // 짧은 gap 병합 — 단어 사이 호흡은 한 구간으로 묶기
  const minGapS = minGapMs / 1000
  const merged: SpeechSegment[] = []
  for (const seg of segments) {
    const last = merged[merged.length - 1]
    if (last && seg.start - last.end < minGapS) last.end = seg.end
    else merged.push({ ...seg })
  }
  return merged
}

/** 특정 시간 [t0, t1] 범위와 겹치는 발음 구간만 반환 */
export function speechSegmentsInRange(
  segments: SpeechSegment[], t0: number, t1: number,
): SpeechSegment[] {
  return segments.filter(s => s.end > t0 && s.start < t1)
}

/**
 * 특정 시간 t에 가장 가까운 발음 구간 시작/끝 시점을 반환.
 * 안전망 보정: voiceTimings.start/end가 무음 한가운데 떨어진 경우 인접 발음 구간 경계로 스냅.
 */
export function snapToSpeechBoundary(
  segments: SpeechSegment[], t: number, mode: 'start' | 'end',
): number {
  if (segments.length === 0) return t
  // t가 어느 구간 안인지
  for (const seg of segments) {
    if (t >= seg.start && t <= seg.end) return t
  }
  // 무음 — 가장 가까운 경계로 스냅 (모드별 우선순위)
  let best = t
  let bestD = Infinity
  for (const seg of segments) {
    const target = mode === 'start' ? seg.start : seg.end
    const d = Math.abs(target - t)
    if (d < bestD) { bestD = d; best = target }
  }
  return best
}
