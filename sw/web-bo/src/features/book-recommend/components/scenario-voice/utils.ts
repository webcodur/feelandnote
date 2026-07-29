import type { EpisodeData } from '../EpisodeEditor'
import type { VoiceFile, VoiceSection } from '@feelandnote/shared/bo/voice-utils'
import { shortsArrIndexBySlot } from '@feelandnote/shared/bo/voice-utils'
import { bookFieldParts } from '../scenario/utils'
import type { VoiceSelect, VoiceMeta } from './types'

// ── Utility functions ──

export function detectMode(vs: VoiceSelect, hasELVoiceId: boolean): { label: string; color: string } {
  if (!vs) return { label: 'UNSET', color: 'text-danger-text' }
  if (vs.default === 'gemini') {
    const hasELSlots = vs.slots && Object.values(vs.slots).some(v => v === 'elevenlabs')
    if (hasELSlots || hasELVoiceId) return { label: 'PROD (GEM + ELE)', color: 'text-purple-400' }
    return { label: 'PROD (GEM)', color: 'text-blue-400' }
  }
  return { label: vs.default.toUpperCase(), color: 'text-text-secondary' }
}

export function prodFile(sec: VoiceSection): VoiceFile | undefined {
  return sec.elevenlabs ?? sec.gemini ?? sec.common
}

/** tts.replace 치환맵 적용 */
function applyTtsReplace(text: string, ep: EpisodeData): string {
  const replace = ((ep as Record<string, unknown>).tts as { replace?: Record<string, string> } | undefined)?.replace
  if (!replace || !text) return text
  let result = text
  for (const [from, to] of Object.entries(replace)) {
    result = result.replaceAll(from, to)
  }
  return result
}

export function getTextsForSection(key: string, ep: EpisodeData): { original: string; tts: string } {
  const ttsData = (ep as Record<string, unknown>).tts as { titles?: (string | null)[]; replace?: Record<string, string> } | undefined
  const nr = ep.narrator!
  const ho = ep.host!
  const bks = ep.books!
  const r = (text: string) => applyTtsReplace(text, ep)

  const directMap: Record<string, () => { original: string; tts: string }> = {
    'A1-service-greeting': () => ({ original: nr.serviceGreeting ?? '', tts: r(nr.serviceGreeting ?? '') }),
    'A2-service-intro': () => ({ original: nr.serviceIntro ?? '', tts: r(nr.serviceIntro ?? '') }),
    'A3-featured-quote': () => ({ original: ho.featuredQuote ?? '', tts: '' }),
    'B1-celeb-intro': () => ({ original: nr.celebIntro ?? '', tts: r(nr.celebIntro ?? '') }),
    'B2-philosophy': () => ({ original: ho.philosophy ?? '', tts: r(ho.philosophy ?? '') }),
    'E1-outro': () => ({ original: nr.outro ?? '', tts: r(nr.outro ?? '') }),
    'E3-return-intro': () => ({ original: nr.returnIntro ?? '', tts: '' }),
    'E4-prev-recap': () => ({ original: nr.prevRecap ?? '', tts: '' }),
  }
  if (directMap[key]) return directMap[key]()

  const bookMatch = key.match(/^D(\d{2})([a-c])(\d*)-/)
  if (bookMatch) {
    const idx = parseInt(bookMatch[1]) - 1
    const phase = bookMatch[2]
    const part = bookMatch[3] ? parseInt(bookMatch[3]) - 1 : 0  // b2 → 토막 1
    const book = bks[idx]
    if (!book) return { original: '', tts: '' }
    const partText = (full: string | undefined, parts?: string[]) =>
      bookFieldParts(full, parts)[part] ?? ''
    const phaseMap: Record<string, () => { original: string; tts: string }> = {
      'a': () => {
        const orig = [book.title, book.creator, book.stats?.publishYear].filter(Boolean).join(', ')
        return { original: orig, tts: ttsData?.titles?.[idx] ?? '' }
      },
      'b': () => {
        const t = partText(book.summary, (book as any).summaryParts)
        return { original: t, tts: r(t) }
      },
      'c': () => {
        const t = partText(book.contextMain, (book as any).contextMainParts)
        return { original: t, tts: r(t) }
      },
    }
    return phaseMap[phase]?.() ?? { original: '', tts: '' }
  }

  // quotePairs: D{nn}d{N}-quote / D{nn}d{N}(_p)-after (후속 맥락은 토막 분할 시 _p 부착)
  const pairMatch = key.match(/^D(\d{2})d(\d+)(?:_(\d+))?-(quote|after)$/)
  if (pairMatch) {
    const idx = parseInt(pairMatch[1]) - 1
    const dn = parseInt(pairMatch[2])
    const partIdx = pairMatch[3] ? parseInt(pairMatch[3]) - 1 : 0  // _2 → 토막 1
    const pi = Math.floor((dn - 1) / 2)
    const isQuote = pairMatch[4] === 'quote'
    const book = bks[idx]
    if (!book) return { original: '', tts: '' }
    const pair = (book as any).quotePairs?.[pi]
    if (!pair) return { original: '', tts: '' }
    if (isQuote) return { original: pair.quote ?? '', tts: r(pair.quote ?? '') }
    const t = bookFieldParts(pair.after, pair.afterParts)[partIdx] ?? ''
    return { original: t, tts: r(t) }
  }

  // 옵션 2: shorts-{N}/S{NN}-{id} 필수 (N은 1-based)
  const shortMatch = key.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
  if (shortMatch && ep.shorts) {
    const arr: any[] = Array.isArray(ep.shorts) ? ep.shorts : [ep.shorts]
    const sIdx = shortsArrIndexBySlot(arr, parseInt(shortMatch[1], 10))  // shorts-{N} = 고정 slot
    const seg = arr[sIdx]?.segments?.find((s: { id: string }) => s.id === shortMatch[2])
    return { original: seg?.text ?? '', tts: r(seg?.text ?? '') }
  }

  return { original: '', tts: '' }
}

/** 원문 텍스트 수정 (tts 필드는 로컬 state 전용이므로 여기서 처리하지 않음) */
export function setTextForSection(key: string, value: string, ep: EpisodeData): EpisodeData {
  const next = JSON.parse(JSON.stringify(ep)) as EpisodeData

  const nr = next.narrator!, ho = next.host!, bks = next.books!
  const directOriginal: Record<string, (v: string) => void> = {
    'A1-service-greeting': v => { nr.serviceGreeting = v },
    'A2-service-intro': v => { nr.serviceIntro = v },
    'A3-featured-quote': v => { ho.featuredQuote = v },
    'B1-celeb-intro': v => { nr.celebIntro = v },
    'B2-philosophy': v => { ho.philosophy = v },
    'E1-outro': v => { nr.outro = v },
    'E3-return-intro': v => { nr.returnIntro = v },
    'E4-prev-recap': v => { nr.prevRecap = v },
  }

  if (directOriginal[key]) { directOriginal[key](value); return next }

  const bookMatch = key.match(/^D(\d{2})([a-c])(\d*)-/)
  if (bookMatch) {
    const idx = parseInt(bookMatch[1]) - 1
    const phase = bookMatch[2]
    const part = bookMatch[3] ? parseInt(bookMatch[3]) - 1 : 0
    if (bks[idx]) {
      const phaseField: Record<string, 'summary' | 'contextMain'> = { b: 'summary', c: 'contextMain' }
      const field = phaseField[phase]
      if (field) {
        const bookRec = bks[idx] as Record<string, unknown>
        const partsKey = field === 'summary' ? 'summaryParts' : 'contextMainParts'
        const parts = bookFieldParts(bookRec[field] as string | undefined, bookRec[partsKey] as string[] | undefined)
        if (parts.length > 1 && part < parts.length) {
          // 토막 수정 — 토막 목록과 본문(join) 동시 갱신
          const nextParts = [...parts]
          nextParts[part] = value
          bookRec[partsKey] = nextParts
          bookRec[field] = nextParts.join('\n\n')
        } else {
          bookRec[field] = value
        }
      }
    }
    return next
  }

  // quotePairs: D{nn}d{N}-quote / D{nn}d{N}(_p)-after (후속 맥락 토막 분할 시 _p)
  const pairMatch = key.match(/^D(\d{2})d(\d+)(?:_(\d+))?-(quote|after)$/)
  if (pairMatch) {
    const idx = parseInt(pairMatch[1]) - 1
    const dn = parseInt(pairMatch[2])
    const partIdx = pairMatch[3] ? parseInt(pairMatch[3]) - 1 : 0
    const pi = Math.floor((dn - 1) / 2)
    const isQuote = pairMatch[4] === 'quote'
    if (bks[idx]) {
      const pairs = [...((bks[idx] as any).quotePairs ?? [])]
      if (pairs[pi]) {
        if (isQuote) {
          pairs[pi] = { ...pairs[pi], quote: value }
        } else {
          const parts = bookFieldParts(pairs[pi].after, pairs[pi].afterParts)
          if (parts.length > 1 && partIdx < parts.length) {
            const nextParts = [...parts]
            nextParts[partIdx] = value
            pairs[pi] = { ...pairs[pi], afterParts: nextParts, after: nextParts.join('\n\n') }
          } else {
            pairs[pi] = { ...pairs[pi], after: value }
          }
        }
        ;(bks[idx] as any).quotePairs = pairs
      }
    }
    return next
  }

  // 옵션 2: shorts-{N}/S{NN}-{id} 필수 (N은 1-based)
  const shortMatch = key.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
  if (shortMatch && next.shorts) {
    const arr: any[] = Array.isArray(next.shorts) ? next.shorts : [next.shorts]
    const sIdx = shortsArrIndexBySlot(arr, parseInt(shortMatch[1], 10))  // shorts-{N} = 고정 slot
    const seg = arr[sIdx]?.segments?.find((s: { id: string }) => s.id === shortMatch[2])
    if (seg) seg.text = value
    return next
  }

  return next
}

// ── section key → voice 메타 JSON path ──
// 결과는 dot/bracket notation. 매핑 불가 시 null. ELE 대상이 아닌 라인은 null.

export function sectionVoicePath(key: string, ep: EpisodeData): string | null {
  const base = key
  if (base === 'A3-featured-quote') return 'host.featuredQuoteVoice'
  if (base === 'B2-philosophy') return 'host.philosophyVoice'

  // 롱폼 셀럽 인용: D{nn}d{N}-quote (after는 narrator라 ELE 대상 아님)
  const pairMatch = base.match(/^D(\d{2})d(\d+)-quote$/)
  if (pairMatch) {
    const bi = parseInt(pairMatch[1]) - 1
    const dn = parseInt(pairMatch[2])
    const pi = Math.floor((dn - 1) / 2)
    return `books[${bi}].quotePairs[${pi}].voice`
  }

  // 쇼츠: shorts-{N}/S{NN}-{segId}
  const shortMatch = base.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
  if (shortMatch) {
    const segId = shortMatch[2]
    const arr = Array.isArray(ep.shorts) ? ep.shorts : []
    const sIdx0 = shortsArrIndexBySlot(arr, parseInt(shortMatch[1], 10))  // shorts-{N} = 고정 slot
    const segments = (arr[sIdx0] as { segments?: Array<{ id: string; role?: string }> } | undefined)?.segments
    if (!segments) return null
    const segIdx = segments.findIndex(s => s.id === segId)
    if (segIdx < 0) return null
    if (segments[segIdx].role !== 'celeb') return null
    return `shorts[${sIdx0}].segments[${segIdx}].voice`
  }

  return null
}

// ── segment voice 메타 읽기 ──
// path 표현을 episode 객체에서 dereference 한다. ko/en 본체와 shorts 외부 파일 모두
// EpisodeData에 머지된 상태(loadEpisode)이므로 동일하게 동작한다.

// ── 롱폼 구간별 발화 스타일 ──

/** narrator/summary 구간 기본 발화 스타일 — 공유 정책(voice-policy)이 단일원천. CLI 와 같은 값. */
export { NARRATOR_STYLE_DEFAULT } from '@feelandnote/shared/lib/voice-policy'

/** 롱폼 구간키 → voiceStyles 저장 키. 쇼츠(shorts-{N}/…)는 segment.style을 쓰므로 null. */
export function sectionStyleKey(secKey: string): string | null {
  if (/^shorts-\d+\//.test(secKey)) return null
  return secKey
}

/** celeb 발화 구간 판별 — 미리듣기 스타일 폴백을 host.voiceStyle로 할지 결정 */
export function isCelebSection(secKey: string): boolean {
  return secKey === 'A3-featured-quote' || secKey === 'B2-philosophy' || /^D\d{2}d\d+-quote$/.test(secKey)
}

export function readSegmentVoiceMeta(ep: EpisodeData, voicePath: string | null): VoiceMeta | undefined {
  if (!voicePath) return undefined
  // path 파싱 — meta route와 동일 규칙 (간이판: 영문/숫자/_만)
  const segs: Array<string | number> = []
  let i = 0
  while (i < voicePath.length) {
    if (voicePath[i] === '.') { i++; continue }
    if (voicePath[i] === '[') {
      const close = voicePath.indexOf(']', i)
      if (close < 0) return undefined
      const idx = Number(voicePath.slice(i + 1, close))
      if (!Number.isInteger(idx)) return undefined
      segs.push(idx)
      i = close + 1
      continue
    }
    let j = i
    while (j < voicePath.length && voicePath[j] !== '.' && voicePath[j] !== '[') j++
    segs.push(voicePath.slice(i, j))
    i = j
  }
  let cur: unknown = ep
  for (const s of segs) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string | number, unknown>)[s]
    if (cur === undefined) return undefined
  }
  if (cur && typeof cur === 'object') return cur as VoiceMeta
  return undefined
}
