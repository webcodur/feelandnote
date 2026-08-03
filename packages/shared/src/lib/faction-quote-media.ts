/**
 * 세력도감 개인 화보의 웹 재생 묶음.
 *
 * 제작 저장소의 로컬 경로와 발화시각은 출간 때 공개 URL·재생 초로 바뀐다. 웹은 이 값만 읽어
 * 음성을 재생하고 사진을 넘긴다. 첫 사진은 정지 상태의 표지이며, 같은 `at` 값이 연속되면
 * 뒤 사진이 재생 시점의 최종 사진이다(기본 화보 → 대사용 화보가 0초에 바뀌는 경우).
 */
export interface FactionQuoteMediaImage {
  url: string
  /** 음성 재생 시작 기준 초. 재생 배속까지 반영된 화면 시각이다. */
  at: number
  focus?: FactionQuoteMediaFocus
}

export interface FactionQuoteMediaFocus {
  x: number
  y: number
}

export interface FactionQuoteMediaCaption {
  /** 제작의 quoteChunks 한 덩어리. 원문은 고치지 않고 공백만 정리한다. */
  text: string
  /** 음성 재생 시작 기준 초. subTimings가 있으면 실제 발화 경계, 없으면 글자수 비례 시각이다. */
  at: number
}

export interface FactionQuoteMedia {
  version: 1
  /** 현재 팩션 음성 폴더의 언어. 다른 locale 화면에서는 음성을 재생하지 않는다. */
  locale: 'ko' | 'en'
  audioUrl: string | null
  /** 원본 wav 재생 배속. 이미지 `at`은 이미 이 배속을 반영한 값이다. */
  playbackRate: number
  /** 배속 반영 후 실제 재생 길이. 음성이 없거나 길이를 모르면 null. */
  duration: number | null
  images: FactionQuoteMediaImage[]
  /** 발화 호흡·의미 단위 자막. 구형 출간 묶음은 빈 배열로 정규화된다. */
  captions: FactionQuoteMediaCaption[]
}

const finiteNonNegative = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return Math.round(value * 1000) / 1000
}

const focusOf = (value: unknown): FactionQuoteMediaFocus | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const focus = value as Record<string, unknown>
  if (typeof focus.x !== 'number' || !Number.isFinite(focus.x)) return undefined
  if (typeof focus.y !== 'number' || !Number.isFinite(focus.y)) return undefined
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 100) / 100))
  return { x: clamp(focus.x), y: clamp(focus.y) }
}

/** DB jsonb를 공개 계약으로 정규화한다. 깨진 항목은 조용히 버리고 묶음 자체가 비면 null이다. */
export function toFactionQuoteMedia(value: unknown): FactionQuoteMedia | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.images)) return null

  const images = row.images.flatMap((item, order) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const image = item as Record<string, unknown>
    const url = typeof image.url === 'string' ? image.url.trim() : ''
    const at = finiteNonNegative(image.at)
    const focus = focusOf(image.focus)
    return url && at !== null ? [{ url, at, focus, order }] : []
  })
    .sort((a, b) => a.at - b.at || a.order - b.order)
    .map(({ url, at, focus }) => ({ url, at, ...(focus ? { focus } : {}) }))

  const captions = (Array.isArray(row.captions) ? row.captions : []).flatMap((item, order) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const caption = item as Record<string, unknown>
    const text = typeof caption.text === 'string' ? caption.text.trim() : ''
    const at = finiteNonNegative(caption.at)
    return text && at !== null ? [{ text, at, order }] : []
  })
    .sort((a, b) => a.at - b.at || a.order - b.order)
    .map(({ text, at }) => ({ text, at }))

  if (!images.length) return null

  const rawRate = typeof row.playbackRate === 'number' && Number.isFinite(row.playbackRate)
    ? row.playbackRate
    : 1
  const playbackRate = Math.min(2, Math.max(0.5, rawRate))
  const duration = row.duration == null ? null : finiteNonNegative(row.duration)
  const audioUrl = typeof row.audioUrl === 'string' && row.audioUrl.trim() ? row.audioUrl.trim() : null

  return {
    version: 1,
    locale: row.locale === 'en' ? 'en' : 'ko',
    audioUrl,
    playbackRate,
    duration,
    images,
    captions,
  }
}
