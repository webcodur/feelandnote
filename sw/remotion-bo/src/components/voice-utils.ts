import type { R2FileInfo } from './R2Status'

// ── Audio utility functions ──

/** PCM -> WAV encoding (mono/stereo, 16-bit, with trim range) */
export function encodeWAV(buf: AudioBuffer, startSec = 0, endSec?: number): ArrayBuffer {
  const sr = buf.sampleRate
  const s0 = Math.round(startSec * sr)
  const s1 = Math.round((endSec ?? buf.duration) * sr)
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

/** ELE 대상 섹션인지 판별 (셀럽 음성 섹션) */
export function isEleSection(key: string): boolean {
  return key === 'A3-featured-quote' || key === 'B2-philosophy' || /^D\d{2}d-/.test(key) || /^S\d{2}-celeb-/.test(key)
}

/** 섹션 키 → webR2 URL 생성 (명언만 해당) */
export function webR2UrlForSection(key: string, celebId: string | undefined, locale: string, r2Base: string): string | undefined {
  if (!celebId) return undefined
  if (key === 'A3-featured-quote') return `${r2Base}/celebs/${celebId}/voice/${locale}/quote.mp3`
  return undefined
}

/** 파일명 → 한글 설명 */
export function describeFile(name: string): string {
  const base = name.replace(/^(gemini|cloud|elevenlabs)\//, '').replace('.wav', '')
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
  const bookMatch = base.match(/^D(\d{2})([a-e])-/)
  if (bookMatch) {
    const n = parseInt(bookMatch[1])
    const phase: Record<string, string> = { a: '제목', b: '요약', c: '맥락', d: '인용', e: '후속' }
    return `책${n} ${phase[bookMatch[2]] ?? ''}`
  }
  const shortMatch = base.match(/^S\d{2}-(.+)$/)
  if (shortMatch) return `쇼츠: ${shortMatch[1]}`
  return ''
}

/** 파일명에서 섹션 키 추출 (엔진 접두사 제거) */
export function sectionKey(name: string): string {
  return name.replace(/^(gemini|cloud|elevenlabs)\//, '').replace('.wav', '')
}

/** 파일명에서 엔진 슬롯 판별 */
export function engineSlot(name: string): 'gemini' | 'cloud' | 'elevenlabs' | 'common' {
  if (name.startsWith('gemini/')) return 'gemini'
  if (name.startsWith('cloud/')) return 'cloud'
  if (name.startsWith('elevenlabs/')) return 'elevenlabs'
  return 'common'
}

export type VoiceSection = {
  key: string
  description: string
  gemini?: R2FileInfo
  cloud?: R2FileInfo
  elevenlabs?: R2FileInfo
  common?: R2FileInfo
}

/** 에피소드 JSON에서 필요한 전체 섹션 키 목록 생성 */
export function expectedSections(ep: { narrator: Record<string, unknown>; host: Record<string, unknown>; books: Array<Record<string, unknown>>; shorts?: { segments: Array<{ id: string; role: string }> } }): { key: string; description: string }[] {
  const result: { key: string; description: string }[] = []
  const add = (key: string) => result.push({ key, description: describeFile(key + '.wav') })

  if (ep.narrator.serviceGreeting || (ep.narrator.serviceGreetingDuration as number) > 0) add('A1-service-greeting')
  if (ep.narrator.serviceIntro || (ep.narrator.serviceIntroDuration as number) > 0) add('A2-service-intro')
  if (ep.host.featuredQuote || (ep.host.featuredQuoteDuration as number) > 0) add('A3-featured-quote')
  if (ep.narrator.celebIntro || (ep.narrator.celebIntroDuration as number) > 0) add('B1-celeb-intro')
  if (ep.host.philosophy || (ep.host.voiceDuration as number) > 0) add('B2-philosophy')
  if ((ep.narrator.labelSummaryDuration as number) > 0) add('C1-label-summary')
  if ((ep.narrator.labelContextDuration as number) > 0) add('C2-label-context')

  for (let i = 0; i < ep.books.length; i++) {
    const b = ep.books[i]
    const bn = String(i + 1).padStart(2, '0')
    add(`D${bn}a-title`)
    add(`D${bn}b-summary`)
    add(`D${bn}c-context`)
    if (b.directQuote || (b.quoteDuration as number) > 0) add(`D${bn}d-quote`)
    if (b.contextAfter || (b.contextAfterDuration as number) > 0) add(`D${bn}e-context-after`)
  }

  if ((ep.narrator.outroDuration as number) > 0 || ep.narrator.outro) add('E1-outro')
  if ((ep.narrator.interludeDuration as number) > 0) add('E2-interlude')
  if ((ep.narrator.returnIntroDuration as number) > 0 || ep.narrator.returnIntro) add('E3-return-intro')
  if ((ep.narrator.prevRecapDuration as number) > 0 || ep.narrator.prevRecap) add('E4-prev-recap')

  if (ep.shorts) {
    ep.shorts.segments.forEach((seg, i) => {
      const idx = String(i + 1).padStart(2, '0')
      add(`S${idx}-${seg.id}`)
    })
  }

  return result
}

/** 파일 목록을 섹션 단위로 그룹핑 (에피소드 기대 섹션 포함) */
export function groupBySection(files: R2FileInfo[], ep?: { narrator: Record<string, unknown>; host: Record<string, unknown>; books: Array<Record<string, unknown>>; shorts?: { segments: Array<{ id: string; role: string }> } }): VoiceSection[] {
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
