// ── Audio utility functions ──

/** PCM -> WAV encoding (mono/stereo, 16-bit, with trim range) */
export function encodeWAV(buf: AudioBuffer, startSec = 0, endSec?: number): ArrayBuffer {
  const sr = buf.sampleRate
  const s0 = Math.round(startSec * sr)
  const s1 = endSec != null ? Math.round(endSec * sr) : buf.length
  const len = s1 - s0
  const ch = buf.numberOfChannels
  const bps = 2
  const dataLen = len * ch * bps
  const ab = new ArrayBuffer(44 + dataLen)
  const v = new DataView(ab)
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); ws(8, 'WAVE')
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, ch, true); v.setUint32(24, sr, true)
  v.setUint32(28, sr * ch * bps, true); v.setUint16(32, ch * bps, true)
  v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, dataLen, true)
  let off = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const sample = Math.max(-1, Math.min(1, buf.getChannelData(c)[s0 + i]))
      v.setInt16(off, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      off += 2
    }
  }
  return ab
}

export function abToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

/** Apply gain (dB) with limiter */
export async function applyGain(buf: AudioBuffer, gainDb: number): Promise<AudioBuffer> {
  if (gainDb <= 0) return buf
  const ratio = Math.pow(10, gainDb / 20)
  const offCtx = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate)
  const src = offCtx.createBufferSource()
  src.buffer = buf
  const gain = offCtx.createGain()
  gain.gain.value = ratio
  const limiter = offCtx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 6
  limiter.ratio.value = 20
  limiter.attack.value = 0.003
  limiter.release.value = 0.15
  src.connect(gain)
  gain.connect(limiter)
  limiter.connect(offCtx.destination)
  src.start(0)
  return offCtx.startRendering()
}

/** Decode audio, optionally apply gain, return WAV base64 + preview blob URL.
 * WAV + no boost: returns original base64 without re-encoding (no decoder padding loss). */
export async function prepareAudioPreview(
  rawBase64: string,
  sourceFormat: 'wav' | 'mp3',
  volumeBoostDb: number,
): Promise<{ base64: string; blobUrl: string; duration: number }> {
  const rawBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0))
  const needsReEncode = sourceFormat !== 'wav' || volumeBoostDb > 0

  const audioCtx = new AudioContext()
  const audioBuf = await audioCtx.decodeAudioData(rawBytes.buffer.slice(0) as ArrayBuffer)

  let base64: string
  let blob: Blob
  let duration: number

  if (needsReEncode) {
    const processed = volumeBoostDb > 0
      ? await applyGain(audioBuf, volumeBoostDb)
      : audioBuf
    const wavBuf = encodeWAV(processed)
    base64 = abToBase64(wavBuf)
    blob = new Blob([wavBuf], { type: 'audio/wav' })
    duration = processed.duration
  } else {
    base64 = rawBase64
    blob = new Blob([rawBytes], { type: 'audio/wav' })
    duration = audioBuf.duration
  }

  await audioCtx.close()
  return { base64, blobUrl: URL.createObjectURL(blob), duration }
}

/** Process audio for save (no blob URL). Returns WAV base64.
 * WAV + no boost: returns original base64 without re-encoding. */
export async function prepareAudioForSave(
  rawBase64: string,
  sourceFormat: 'wav' | 'mp3',
  volumeBoostDb: number,
): Promise<string> {
  if (sourceFormat === 'wav' && volumeBoostDb <= 0) return rawBase64
  const rawBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0))
  const audioCtx = new AudioContext()
  const audioBuf = await audioCtx.decodeAudioData(rawBytes.buffer.slice(0) as ArrayBuffer)
  const processed = volumeBoostDb > 0 ? await applyGain(audioBuf, volumeBoostDb) : audioBuf
  const wavBuf = encodeWAV(processed)
  await audioCtx.close()
  return abToBase64(wavBuf)
}

/** 생성 및 저장 완료 알림 — 음원을 자동 재생하지 않고 짧은 '띵' 비프만 울린다. */
export function playDing() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    const t = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
    osc.start(t)
    osc.stop(t + 0.45)
    osc.onended = () => { void ctx.close() }
  } catch { /* 알림음 실패는 무시 */ }
}
