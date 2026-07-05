import type { VoiceSection } from '../../voice-utils'
import type { VoiceInfo } from '../types'
import { isVideoFile } from '@/lib/media-exts'

export { isVideoFile }

export * from './image'

/**
 * 객체의 한 필드를 갱신해 새 객체로 반환한다.
 * value 가 undefined 이면 키 자체를 제거한다(JSON 을 깔끔하게 유지).
 * dropFalse=true 이면 false 도 제거 대상(speaker · topRight 등 기본값 의미가 있는 필드용).
 * zoomIn 처럼 false 가 명시적 의미(강제 OFF)인 자리는 dropFalse=false(기본값) 유지.
 */
export function setField<T extends Record<string, unknown>>(
  obj: T,
  field: string,
  value: unknown,
  opts?: { dropFalse?: boolean }
): T {
  const dropFalse = opts?.dropFalse ?? false
  const { [field]: _drop, ...rest } = obj
  if (value === undefined || (dropFalse && value === false)) return rest as T
  return { ...obj, [field]: value } as T
}

/** imageBaseUrl(`/api/{series}/images/{ep}`) 기준 파일 src 생성. 영상은 videos 라우트로 스왑.
 *  fileName 이 「<책>/<sub>/basename」 상대경로일 수 있어 슬래시는 보존하고 각 토막만 인코딩한다. */
export function mediaSrc(imageBaseUrl: string, fileName: string): string {
  const encoded = fileName.split('/').map(encodeURIComponent).join('/')
  if (isVideoFile(fileName)) {
    return `${imageBaseUrl.replace('/images/', '/videos/')}/${encoded}`
  }
  return `${imageBaseUrl}/${encoded}`
}

export function bookKey(i: number, phase: string) {
  return `D${String(i + 1).padStart(2, '0')}${phase}`
}

/** 긴 서술 필드(핵심 요약·감상 배경)의 토막 목록.
 *  sw/remotion `field-parts.ts`의 bookFieldParts와 동일 규약 — 양쪽이 어긋나면 행/음원 매핑이 깨진다.
 *  토막 목록 우선, 폴백은 전체 텍스트 1토막. 빈 토막 제외. */
export function bookFieldParts(full: string | undefined, parts?: string[]): string[] {
  if (parts && parts.length > 0) {
    const filtered = parts.filter(p => typeof p === 'string' && p.trim().length > 0)
    if (filtered.length > 0) return filtered
  }
  return full && full.trim().length > 0 ? [full] : []
}

/** 토막 phase 문자열 — 첫 토막은 기존 키(b-summary), 둘째부터 b2-summary 식 번호 부착 */
export function partPhase(letter: 'b' | 'c', suffix: 'summary' | 'context', p: number) {
  return p === 0 ? `${letter}-${suffix}` : `${letter}${p + 1}-${suffix}`
}

/** 후속 맥락 토막 phase — 인용 쌍 pairIdx 의 후속 맥락 토막 part 키.
 *  첫 토막은 d{2k+2}-after, 둘째부터 언더스코어 부착 d{2k+2}_2-after.
 *  sw/remotion vnBookAfter 규약과 1:1 일치해야 음원 매핑이 깨지지 않는다. */
export function afterPhase(pairIdx: number, part: number) {
  return `d${pairIdx * 2 + 2}${part > 0 ? `_${part + 1}` : ''}-after`
}

/**
 * 옵션 2: 쇼츠 파일 키. shortsIndex는 1-based(필수 접두사).
 * 예: shorts-1/S01-hook, shorts-2/S03-book-title
 */
export function shortsKey(i: number, segId: string, shortsIndex = 1) {
  const base = `S${String(i + 1).padStart(2, '0')}-${segId}`
  return `shorts-${shortsIndex}/${base}`
}

export function lookupVoice(sectionMap: Map<string, VoiceSection>, key: string, durationFromJson?: number): VoiceInfo {
  const sec = sectionMap.get(key)
  const exists = !!(sec?.gemini || sec?.elevenlabs || sec?.common)
  const fileDur = sec?.gemini?.duration ?? sec?.elevenlabs?.duration ?? sec?.common?.duration
  return { sectionKey: key, duration: durationFromJson ?? fileDur, audioDuration: fileDur, exists }
}

export function splitHighlights(text: string, anchors: string[]): { text: string; highlight: boolean }[] {
  if (!anchors.length) return [{ text, highlight: false }]
  const parts: { text: string; highlight: boolean }[] = []
  const sorted = anchors
    .map(a => ({ anchor: a, idx: text.indexOf(a) }))
    .filter(a => a.idx >= 0)
    .sort((a, b) => a.idx - b.idx)
  let cursor = 0
  for (const { anchor, idx } of sorted) {
    const pos = text.indexOf(anchor, cursor)
    if (pos < 0) continue
    if (pos > cursor) parts.push({ text: text.slice(cursor, pos), highlight: false })
    parts.push({ text: anchor, highlight: true })
    cursor = pos + anchor.length
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlight: false })
  return parts.length ? parts : [{ text, highlight: false }]
}

export const stripExt = (f: string) => f.replace(/\.[^.]+$/, '')
