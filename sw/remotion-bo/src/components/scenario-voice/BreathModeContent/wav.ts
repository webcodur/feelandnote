/** PCM 16-bit WAV 파싱·구간 무음 처리 — 들숨 제거 모드 전용.
 *  원본 파일 바이트를 통째로 복사한 뒤 data 청크의 해당 샘플만 수정한다.
 *  재인코딩이 없으므로 무음 구간 밖은 바이트 단위로 원본과 동일하다(무손실 라운드트립). */

export type ParsedWav = {
  sampleRate: number
  channels: number
  /** data 청크 내 샘플 영역 시작 바이트 오프셋 */
  dataOffset: number
  /** 프레임 수 (채널 묶음 단위) */
  frameCount: number
  /** 원본 파일 전체 바이트 */
  bytes: ArrayBuffer
  duration: number
}

export type Region = { id: number; start: number; end: number }

function chunkId(view: DataView, off: number): string {
  return String.fromCharCode(view.getUint8(off), view.getUint8(off + 1), view.getUint8(off + 2), view.getUint8(off + 3))
}

export function parseWav(buf: ArrayBuffer): ParsedWav {
  const view = new DataView(buf)
  if (buf.byteLength < 44 || chunkId(view, 0) !== 'RIFF' || chunkId(view, 8) !== 'WAVE') {
    throw new Error('WAV 파일이 아니다 (RIFF/WAVE 헤더 없음)')
  }
  let off = 12
  let fmt: { audioFormat: number; channels: number; sampleRate: number; bitsPerSample: number } | null = null
  let dataOffset = -1
  let dataSize = 0
  while (off + 8 <= buf.byteLength) {
    const id = chunkId(view, off)
    const size = view.getUint32(off + 4, true)
    if (id === 'fmt ') {
      fmt = {
        audioFormat: view.getUint16(off + 8, true),
        channels: view.getUint16(off + 10, true),
        sampleRate: view.getUint32(off + 12, true),
        bitsPerSample: view.getUint16(off + 22, true),
      }
    } else if (id === 'data') {
      dataOffset = off + 8
      dataSize = Math.min(size, buf.byteLength - dataOffset)
    }
    off += 8 + size + (size % 2) // 청크는 2바이트 정렬
  }
  if (!fmt || dataOffset < 0) throw new Error('WAV 청크 구조가 깨졌다 (fmt/data 없음)')
  if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error(`지원하지 않는 WAV 형식 (PCM 16-bit만 지원, format=${fmt.audioFormat}, bits=${fmt.bitsPerSample})`)
  }
  const frameCount = Math.floor(dataSize / (2 * fmt.channels))
  return {
    sampleRate: fmt.sampleRate,
    channels: fmt.channels,
    dataOffset,
    frameCount,
    bytes: buf,
    duration: frameCount / fmt.sampleRate,
  }
}

/** 0번 채널을 Float32 [-1,1] 로 추출 — 파형 그리기용 */
export function channelToFloat(wav: ParsedWav): Float32Array {
  const view = new DataView(wav.bytes)
  const out = new Float32Array(wav.frameCount)
  const stride = 2 * wav.channels
  for (let i = 0; i < wav.frameCount; i++) {
    out[i] = view.getInt16(wav.dataOffset + i * stride, true) / 32768
  }
  return out
}

/** 구간별 게인 — 무음 구간 안은 0, 경계 fade 안은 1→0 / 0→1 선형 램프 */
function frameGain(frame: number, regionsInFrames: { s: number; e: number; fade: number }[]): number {
  for (const r of regionsInFrames) {
    if (frame < r.s || frame >= r.e) continue
    const fade = Math.min(r.fade, Math.floor((r.e - r.s) / 2))
    if (frame < r.s + fade) return 1 - (frame - r.s) / fade
    if (frame >= r.e - fade) return (frame - (r.e - fade)) / fade
    return 0
  }
  return 1
}

function toFrameRegions(wav: ParsedWav, regions: Region[], fadeMs: number) {
  const fade = Math.max(1, Math.round((fadeMs / 1000) * wav.sampleRate))
  return regions.map(r => ({
    s: Math.max(0, Math.floor(r.start * wav.sampleRate)),
    e: Math.min(wav.frameCount, Math.ceil(r.end * wav.sampleRate)),
    fade,
  })).filter(r => r.e > r.s)
}

/** 원본 바이트 복사본에서 regions 구간만 무음 처리한 새 WAV 바이트를 만든다 */
export function muteRegions(wav: ParsedWav, regions: Region[], fadeMs = 5): ArrayBuffer {
  const out = wav.bytes.slice(0)
  const view = new DataView(out)
  const stride = 2 * wav.channels
  for (const r of toFrameRegions(wav, regions, fadeMs)) {
    for (let f = r.s; f < r.e; f++) {
      const g = frameGain(f, [r])
      const base = wav.dataOffset + f * stride
      for (let c = 0; c < wav.channels; c++) {
        if (g === 0) { view.setInt16(base + c * 2, 0, true); continue }
        view.setInt16(base + c * 2, Math.round(view.getInt16(base + c * 2, true) * g), true)
      }
    }
  }
  return out
}

/** 미리듣기용 AudioBuffer — applyMute 시 regions 구간을 무음으로 */
export function toAudioBuffer(ctx: BaseAudioContext, wav: ParsedWav, regions: Region[], applyMute: boolean, fadeMs = 5): AudioBuffer {
  const buf = ctx.createBuffer(wav.channels, wav.frameCount, wav.sampleRate)
  const view = new DataView(wav.bytes)
  const stride = 2 * wav.channels
  const frameRegions = applyMute ? toFrameRegions(wav, regions, fadeMs) : []
  for (let c = 0; c < wav.channels; c++) {
    const ch = buf.getChannelData(c)
    for (let f = 0; f < wav.frameCount; f++) {
      const g = frameRegions.length ? frameGain(f, frameRegions) : 1
      ch[f] = g === 0 ? 0 : (view.getInt16(wav.dataOffset + f * stride + c * 2, true) / 32768) * g
    }
  }
  return buf
}

export function toBase64(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf)
  let s = ''
  const CHUNK = 0x8000
  for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CHUNK)))
  }
  return btoa(s)
}
