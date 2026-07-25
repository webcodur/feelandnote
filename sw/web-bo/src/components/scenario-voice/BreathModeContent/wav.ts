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

/** 구간 처리 방식 — 'mute' 소리만 0으로(길이 유지), 'cut' 잘라내고 앞뒤 이어붙임(길이 단축) */
export type RegionMode = 'mute' | 'cut'
export type Region = { id: number; start: number; end: number; mode?: RegionMode }

/** 삽입 — 지정 시각(at)에 duration 초 만큼 무음(공백)을 끼워넣는다. (길이 증가) */
export type Insert = { id: number; at: number; duration: number }

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

/** 표준 44바이트 PCM 16-bit WAV 헤더를 쓴다 */
function writeWavHeader(v: DataView, sampleRate: number, channels: number, dataLen: number) {
  const bps = 2
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); ws(8, 'WAVE')
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, channels, true); v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * channels * bps, true); v.setUint16(32, channels * bps, true)
  v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, dataLen, true)
}

/**
 * regions 를 한 번에 적용한 새 WAV 바이트(표준 44B 헤더)를 만든다.
 *  - mode='mute' 구간: 소리를 0으로 깎는다(자리·길이 유지).
 *  - mode='cut'  구간: 잘라내고 앞뒤 프레임을 이어붙인다(전체 길이가 줄어든다).
 * cut 이음매에는 짧은 페이드를 줘 잘라 붙인 자리의 클릭음을 막는다.
 * (mode 미지정은 'mute' 로 간주 — 기존 들숨 제거 동작과 호환)
 */
export function applyRegions(wav: ParsedWav, regions: Region[], fadeMs = 5): ArrayBuffer {
  const sr = wav.sampleRate
  const ch = wav.channels
  const srcView = new DataView(wav.bytes)
  const stride = 2 * ch
  const fade = Math.max(1, Math.round((fadeMs / 1000) * sr))

  // cut 구간 → 프레임, 정렬·병합(겹침 제거)
  const rawCuts = regions
    .filter(r => (r.mode ?? 'mute') === 'cut')
    .map(r => ({ s: Math.max(0, Math.floor(r.start * sr)), e: Math.min(wav.frameCount, Math.ceil(r.end * sr)) }))
    .filter(r => r.e > r.s)
    .sort((a, b) => a.s - b.s)
  const cuts: { s: number; e: number }[] = []
  for (const c of rawCuts) {
    const last = cuts[cuts.length - 1]
    if (last && c.s <= last.e) last.e = Math.max(last.e, c.e)
    else cuts.push({ ...c })
  }

  // 남길 세그먼트 = 전체에서 cut 구간을 뺀 나머지
  const keep: { s: number; e: number }[] = []
  let cursor = 0
  for (const c of cuts) {
    if (c.s > cursor) keep.push({ s: cursor, e: c.s })
    cursor = Math.max(cursor, c.e)
  }
  if (cursor < wav.frameCount) keep.push({ s: cursor, e: wav.frameCount })

  // mute 구간(프레임) — gain 계산용
  const mutes = toFrameRegions(wav, regions.filter(r => (r.mode ?? 'mute') === 'mute'), fadeMs)

  const outFrames = keep.reduce((n, k) => n + (k.e - k.s), 0)
  const dataLen = outFrames * stride
  const ab = new ArrayBuffer(44 + dataLen)
  const ov = new DataView(ab)
  writeWavHeader(ov, sr, ch, dataLen)

  let off = 44
  for (const k of keep) {
    for (let f = k.s; f < k.e; f++) {
      let g = mutes.length ? frameGain(f, mutes) : 1
      // 잘라 붙인 이음매(앞·뒤에 cut 이 있던 경계)에서만 짧게 페이드
      if (k.s > 0 && f < k.s + fade) g *= (f - k.s) / fade
      if (k.e < wav.frameCount && f >= k.e - fade) g *= (k.e - f) / fade
      const base = wav.dataOffset + f * stride
      for (let c = 0; c < ch; c++) {
        const sample = srcView.getInt16(base + c * 2, true)
        ov.setInt16(off, g === 1 ? sample : Math.round(sample * g), true)
        off += 2
      }
    }
  }
  return ab
}

/**
 * regions(제거/무음) + inserts(간격 넓히기)를 모두 적용한 새 WAV를 만든다.
 * - cut: 해당 구간 삭제 + 이어붙이기 (길이 ↓)
 * - mute: 해당 구간 소리만 0 (길이 유지)
 * - insert: at 시점에 duration 초 무음 삽입 (길이 ↑)
 * 결과 길이는 원본 ± 편집량.
 */
export function applyEdits(wav: ParsedWav, regions: Region[], inserts: Insert[] = [], fadeMs = 5): ArrayBuffer {
  const sr = wav.sampleRate
  const ch = wav.channels
  const srcView = new DataView(wav.bytes)
  const stride = 2 * ch
  const fade = Math.max(1, Math.round((fadeMs / 1000) * sr))

  // cut 구간 병합
  const rawCuts = regions
    .filter(r => (r.mode ?? 'mute') === 'cut')
    .map(r => ({ s: Math.max(0, Math.floor(r.start * sr)), e: Math.min(wav.frameCount, Math.ceil(r.end * sr)) }))
    .filter(r => r.e > r.s)
    .sort((a, b) => a.s - b.s)
  const cuts: { s: number; e: number }[] = []
  for (const c of rawCuts) {
    const last = cuts[cuts.length - 1]
    if (last && c.s <= last.e) last.e = Math.max(last.e, c.e)
    else cuts.push({ ...c })
  }

  // mute 구간
  const mutes = toFrameRegions(wav, regions.filter(r => (r.mode ?? 'mute') === 'mute'), fadeMs)

  // inserts (원본 시간 기준, 정렬)
  const ins = (inserts || [])
    .map(i => ({
      atF: Math.max(0, Math.floor(Math.min(wav.duration, i.at) * sr)),
      durF: Math.max(1, Math.round(Math.max(0.01, i.duration) * sr)),
    }))
    .sort((a, b) => a.atF - b.atF)

  // 결과 프레임 수 계산
  const totalCutF = cuts.reduce((n, c) => n + (c.e - c.s), 0)
  const totalInsF = ins.reduce((n, i) => n + i.durF, 0)
  const outFrameCount = wav.frameCount - totalCutF + totalInsF

  const dataLen = outFrameCount * stride
  const ab = new ArrayBuffer(44 + dataLen)
  const ov = new DataView(ab)
  writeWavHeader(ov, sr, ch, dataLen)

  let outOff = 44
  let o = 0 // 원본 프레임 커서
  let iidx = 0

  while (o < wav.frameCount || iidx < ins.length) {
    // 현재 o 이전/이 시점의 삽입 먼저 처리
    while (iidx < ins.length && ins[iidx].atF <= o) {
      for (let k = 0; k < ins[iidx].durF; k++) {
        for (let c = 0; c < ch; c++) {
          ov.setInt16(outOff + c * 2, 0, true)
        }
        outOff += stride
      }
      iidx++
    }
    if (o >= wav.frameCount) break

    // cut 스킵
    let cutEnd: number | null = null
    for (const c of cuts) {
      if (o >= c.s && o < c.e) {
        cutEnd = c.e
        break
      }
    }
    if (cutEnd != null) {
      o = cutEnd
      continue
    }

    // 복사 + mute gain
    const g = mutes.length ? frameGain(o, mutes) : 1
    const base = wav.dataOffset + o * stride
    for (let c = 0; c < ch; c++) {
      const sample = srcView.getInt16(base + c * 2, true)
      ov.setInt16(outOff + c * 2, g === 1 ? sample : Math.round(sample * g), true)
    }
    outOff += stride
    o += 1
  }

  return ab
}

/** 미리듣기용 AudioBuffer — mute·cut·insert 를 모두 반영한 '완성 결과' */
export function toEditedBuffer(ctx: BaseAudioContext, wav: ParsedWav, regions: Region[], inserts: Insert[] = [], fadeMs = 5): AudioBuffer {
  const edited = parseWav(applyEdits(wav, regions, inserts, fadeMs))
  const buf = ctx.createBuffer(edited.channels, Math.max(1, edited.frameCount), edited.sampleRate)
  const view = new DataView(edited.bytes)
  const stride = 2 * edited.channels
  for (let c = 0; c < edited.channels; c++) {
    const chData = buf.getChannelData(c)
    for (let f = 0; f < edited.frameCount; f++) {
      chData[f] = view.getInt16(edited.dataOffset + f * stride + c * 2, true) / 32768
    }
  }
  return buf
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
