/**
 * 대사·음성 작업대의 음향 처리 도구.
 *
 * 브라우저에서만 돈다(Web Audio API). 서버 컴포넌트에서 import 하지 마라.
 */

/** AudioBuffer에 gain(dB) 적용 + 리미터로 클리핑 방지 → 새 AudioBuffer 반환 */
export async function applyGain(buf: AudioBuffer, gainDb: number): Promise<AudioBuffer> {
  if (gainDb <= 0) return buf
  const ratio = Math.pow(10, gainDb / 20)
  const offCtx = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate)
  const src = offCtx.createBufferSource()
  src.buffer = buf
  const gain = offCtx.createGain()
  gain.gain.value = ratio
  // 리미터: 클리핑 방지용 컴프레서
  const limiter = offCtx.createDynamicsCompressor()
  limiter.threshold.value = -6   // -6dB부터 압축 (여유 확보)
  limiter.knee.value = 6         // 소프트 니 (자연스러운 전환)
  limiter.ratio.value = 20       // 거의 리미터
  limiter.attack.value = 0.003   // 약간 느린 어택 (트랜지언트 보존)
  limiter.release.value = 0.15   // 자연스러운 릴리즈
  src.connect(gain)
  gain.connect(limiter)
  limiter.connect(offCtx.destination)
  src.start(0)
  return offCtx.startRendering()
}

/** PCM → WAV 인코딩 (트리밍 구간) */
export function encodeWAV(buf: AudioBuffer, startSec: number, endSec: number): ArrayBuffer {
  const sr = buf.sampleRate
  const s0 = Math.round(startSec * sr)
  const s1 = Math.round(endSec * sr)
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

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}

/** 볼륨 부스트를 적용해 WAV base64로 바꾼다. 부스트가 0이면 원본을 그대로 돌려준다 */
export async function boostToBase64(
  base64: string,
  gainDb: number,
): Promise<{ base64: string; contentType: string }> {
  if (gainDb <= 0) return { base64, contentType: 'audio/mpeg' }
  const raw = base64ToBytes(base64)
  const ctx = new AudioContext()
  try {
    const buf = await ctx.decodeAudioData(raw.buffer.slice(0) as ArrayBuffer)
    const boosted = await applyGain(buf, gainDb)
    const wav = encodeWAV(boosted, 0, boosted.duration)
    return { base64: abToBase64(wav), contentType: 'audio/wav' }
  } finally {
    await ctx.close()
  }
}
