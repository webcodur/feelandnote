// ── Types ──

export type VoiceFile = { name: string; sizeKB: number; duration: number; engine: string }
export type VoiceSummary = { total: number; totalSizeKB: number }

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

/** ELE 대상 섹션인지 판별 (셀럽 음성 섹션). `shorts-N/` prefix가 붙어 있어도 동작한다. */
export function isEleSection(key: string): boolean {
  const base = key.replace(/^shorts-\d+\//, '')
  return base === 'A3-featured-quote' || base === 'B2-philosophy' || /^D\d{2}d\d+-quote$/.test(base) || /^S\d{2}-celeb-/.test(base) || /^S\d{2}-book-quote/.test(base)
}

// ── Engine resolution ──

export type EngineKind = 'gemini' | 'elevenlabs'

export type SegmentEngineSpec = {
  engine: EngineKind
  /** Gemini: prebuilt voice name (e.g., 'Sulafat'). ElevenLabs: voiceId. */
  voiceParam: string
  /** Gemini-only: 발화 스타일 prefix (segment.style 값). */
  stylePrefix?: string
}

/** sectionKey + episode → 단일 segment 생성용 엔진 결정.
 *  단일 생성이 의미있는 경우에만 spec을 돌려준다. 그 외(나레이터/요약 기본 톤 등)는
 *  null을 반환해 상단 도구막대 일괄 생성으로 처리하도록 유도한다.
 *
 *  우선순위 (ElevenLabs voiceId):
 *  segment.elevenlabsVoiceId > speakers[seg.speaker].elevenlabsVoiceId > host.elevenlabsVoiceId
 *
 *  엔진 분기:
 *  1. shorts segment에 `geminiVoice` 오버라이드 → Gemini
 *  2. 셀럽 섹션(isEleSection) + 위 우선순위로 해소된 voiceId 존재 → ElevenLabs
 *  3. 그 외 → null
 */
export function resolveSegmentEngine(
  key: string,
  episode: { host?: { elevenlabsVoiceId?: string; geminiVoice?: string } | null; shorts?: unknown; speakers?: unknown },
): SegmentEngineSpec | null {
  type SegLite = { id: string; geminiVoice?: string; style?: string; elevenlabsVoiceId?: string; speaker?: string }
  type SpeakerLite = { id: string; engine?: 'gemini' | 'elevenlabs'; voiceId?: string; elevenlabsVoiceId?: string }
  type ShortLite = { segments?: SegLite[]; speakers?: SpeakerLite[] }

  // shorts segment 매칭
  const m = key.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
  let seg: SegLite | undefined
  let shortCfg: ShortLite | undefined
  if (m) {
    const sIdx = parseInt(m[1], 10) - 1
    const segId = m[2]
    const arr = Array.isArray(episode.shorts) ? (episode.shorts as ShortLite[]) : []
    shortCfg = arr[sIdx]
    seg = shortCfg?.segments?.find(s => s.id === segId)
  }

  // 화자 풀 — 신구조 SSoT(episode.speakers) 우선, 옛 shortCfg.speakers 폴백
  const epSpeakers = Array.isArray((episode as { speakers?: unknown }).speakers)
    ? ((episode as { speakers: SpeakerLite[] }).speakers)
    : []
  const findSpeaker = (id: string): SpeakerLite | undefined =>
    epSpeakers.find(s => s.id === id) ?? shortCfg?.speakers?.find(s => s.id === id)
  const speakerObj = seg?.speaker ? findSpeaker(seg.speaker) : undefined

  // 1. Gemini 캐릭터 보이스 — segment 직접 > 화자(gemini 엔진)
  if (seg?.geminiVoice) {
    return { engine: 'gemini', voiceParam: seg.geminiVoice, stylePrefix: seg.style }
  }
  if (speakerObj?.engine === 'gemini' && speakerObj.voiceId) {
    return { engine: 'gemini', voiceParam: speakerObj.voiceId, stylePrefix: seg?.style }
  }

  // 2. ELE 셀럽 섹션 — voiceId 우선순위: segment 직접 > 화자(SSoT) > 옛 elevenlabsVoiceId > host
  if (isEleSection(key)) {
    const speakerVoice = speakerObj
      ? (speakerObj.engine === 'elevenlabs' && speakerObj.voiceId ? speakerObj.voiceId : speakerObj.elevenlabsVoiceId)
      : undefined
    const voiceId = seg?.elevenlabsVoiceId ?? speakerVoice ?? episode.host?.elevenlabsVoiceId
    if (voiceId) return { engine: 'elevenlabs', voiceParam: voiceId }
  }

  return null
}

/** 엔진별 음성 파일이 저장되는 폴더 prefix */
export function engineSlotPrefix(engine: EngineKind): 'gemini' | 'elevenlabs' {
  return engine
}

/** 파일명 → 한글 설명 */
export function describeFile(name: string): string {
  const base = name
    .replace(/^(gemini|elevenlabs)\//, '')
    .replace(/^shorts-(\d+)\//, '')
    .replace('.wav', '')
  const direct: Record<string, string> = {
    'A1-service-greeting': '서비스 인사',
    'A2-service-intro': '서비스 소개',
    'A3-featured-quote': '대표 명언',
    'B1-celeb-intro': '인물 소개',
    'B2-philosophy': '감상철학',
    'C1-label-summary': '라벨: 요약',
    'C2-label-context': '라벨: 맥락',
    'E1-outro': '아웃트로',
    'E2-interlude': '중간안내',
    'E3-return-intro': '복귀 인사',
    'E4-prev-recap': '전편 요약',
  }
  if (direct[base]) return direct[base]
  const partMatch = base.match(/^A1-service-greeting-(\d+)$/)
  if (partMatch) return `인사 파트${partMatch[1]}`
  const bookMatch = base.match(/^D(\d{2})([a-c])-/)
  if (bookMatch) {
    const n = parseInt(bookMatch[1])
    const phase: Record<string, string> = { a: '제목', b: '요약', c: '맥락' }
    return `책${n} ${phase[bookMatch[2]] ?? ''}`
  }
  const pairMatch = base.match(/^D(\d{2})d(\d+)-(quote|after)$/)
  if (pairMatch) {
    const n = parseInt(pairMatch[1])
    const dn = parseInt(pairMatch[2])
    const pi = Math.floor((dn - 1) / 2)
    const label = pairMatch[3] === 'quote' ? '인용' : '후속'
    return `책${n} ${label}${pi > 0 ? ` ${pi + 1}` : ''}`
  }
  const shortMatch = base.match(/^S\d{2}-(.+)$/)
  if (shortMatch) return `쇼츠: ${shortMatch[1]}`
  return ''
}

/** 파일명에서 섹션 키 추출 (엔진 접두사 제거) */
export function sectionKey(name: string): string {
  return name.replace(/^(gemini|elevenlabs|common-en|common)\//, '').replace('.wav', '')
}

/** 파일명에서 엔진 슬롯 판별 */
export function engineSlot(name: string): 'gemini' | 'elevenlabs' | 'common' {
  if (name.startsWith('gemini/')) return 'gemini'
  if (name.startsWith('elevenlabs/')) return 'elevenlabs'
  return 'common'
}

export type VoiceSection = {
  key: string
  description: string
  gemini?: VoiceFile
  elevenlabs?: VoiceFile
  common?: VoiceFile
}

/** 에피소드 JSON에서 필요한 전체 섹션 키 목록 생성 */
type ExpectedShortsCfg = { segments: Array<{ id: string; role: string; visual?: string }> }
export function expectedSections(ep: { narrator?: Record<string, unknown>; host?: Record<string, unknown>; books?: Array<Record<string, unknown>>; shorts?: ExpectedShortsCfg | ExpectedShortsCfg[] }): { key: string; description: string }[] {
  const result: { key: string; description: string }[] = []
  const add = (key: string) => result.push({ key, description: describeFile(key + '.wav') })

  // 쇼츠 전용 에피소드 등은 narrator/host/books 가 비어 있을 수 있다. 모두 옵셔널 접근.
  const narrator = ep.narrator ?? {}
  const host = ep.host ?? {}
  const books = ep.books ?? []

  if (narrator.serviceGreeting || (narrator.serviceGreetingDuration as number) > 0) add('A1-service-greeting')
  if (narrator.serviceIntro || (narrator.serviceIntroDuration as number) > 0) add('A2-service-intro')
  if (host.featuredQuote || (host.featuredQuoteDuration as number) > 0) add('A3-featured-quote')
  if (narrator.celebIntro || (narrator.celebIntroDuration as number) > 0) add('B1-celeb-intro')
  if (host.philosophy || (host.voiceDuration as number) > 0) add('B2-philosophy')
  if ((narrator.labelSummaryDuration as number) > 0) add('C1-label-summary')
  if ((narrator.labelContextDuration as number) > 0) add('C2-label-context')

  for (let i = 0; i < books.length; i++) {
    const b = books[i]
    const bn = String(i + 1).padStart(2, '0')
    add(`D${bn}a-title`)
    add(`D${bn}b-summary`)
    add(`D${bn}c-context`)
    // quotePairs: 동적 인용+후속맥락
    for (let pi = 0; pi < ((b.quotePairs as any[])?.length ?? 0); pi++) {
      const pair = (b.quotePairs as any[])[pi]
      if (pair.quote) add(`D${bn}d${pi * 2 + 1}-quote`)
      if (pair.after) add(`D${bn}d${pi * 2 + 2}-after`)
    }
  }

  if ((narrator.outroDuration as number) > 0 || narrator.outro) add('E1-outro')
  if ((narrator.interludeDuration as number) > 0) add('E2-interlude')
  if ((narrator.returnIntroDuration as number) > 0 || narrator.returnIntro) add('E3-return-intro')
  if ((narrator.prevRecapDuration as number) > 0 || narrator.prevRecap) add('E4-prev-recap')

  // 옵션 2: shorts는 1-based 접두사 필수. 모든 쇼츠에 shorts-{N}/S{NN}-{id}
  const shortsArr: ExpectedShortsCfg[] = Array.isArray(ep.shorts)
    ? ep.shorts
    : (ep.shorts ? [ep.shorts] : [])
  shortsArr.forEach((cfg, sIdx) => {
    const prefix = `shorts-${sIdx + 1}/`  // 1-based
    for (let si = 0; si < cfg.segments.length; si++) {
      const seg = cfg.segments[si]
      const idx = String(si + 1).padStart(2, '0')
      add(`${prefix}S${idx}-${seg.id}`)
    }
  })

  return result
}

/** 파일 목록을 섹션 단위로 그룹핑 (에피소드 기대 섹션 포함) */
export function groupBySection(files: VoiceFile[], ep?: { narrator: Record<string, unknown>; host: Record<string, unknown>; books: Array<Record<string, unknown>>; shorts?: ExpectedShortsCfg | ExpectedShortsCfg[] }): VoiceSection[] {
  const map = new Map<string, VoiceSection>()

  // 에피소드에서 기대되는 전체 섹션을 먼저 등록
  if (ep) {
    for (const s of expectedSections(ep)) {
      map.set(s.key, { key: s.key, description: s.description })
    }
  }

  // 실제 파일 매핑
  for (const f of files) {
    const k = sectionKey(f.name)
    if (!map.has(k)) map.set(k, { key: k, description: describeFile(f.name) })
    const sec = map.get(k)!
    const slot = engineSlot(f.name)
    sec[slot] = f
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}
