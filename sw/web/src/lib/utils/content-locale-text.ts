/*
  파일명: /lib/utils/content-locale-text.ts
  기능: 작품 메타 중 언어를 타는 값을 화면 언어에 맞게 고른다.
  책임: 표시 여부만 정한다. 번역하지 않고, 언어가 어긋나는 값은 버린다.
*/ // ------------------------------

const HANGUL_PATTERN = /[가-힣]/

/**
 * 앞에 적은 후보가 이긴다. 영문 화면에서는 한국어 소개를 건너뛴다.
 *
 * 저장·외부 메타에는 카카오 책 소개와 TMDB의 ko-KR 줄거리가 그대로 들어 있어,
 * 언어를 확인하지 않고 집으면 영문 화면에 한국어 소개가 통째로 실린다(26.08.19 사고).
 */
export function pickIntroForLocale(
  locale: string,
  candidates: (string | null | undefined)[],
): string | null {
  for (const candidate of candidates) {
    const text = typeof candidate === 'string' ? candidate.trim() : ''
    if (!text) continue
    if (locale === 'en' && HANGUL_PATTERN.test(text)) continue
    return text
  }
  return null
}

/** DB에 쌓인 메타 중 언어를 타는 값. 대부분 ko-KR 응답을 그대로 저장한 것이다. */
const STORED_KO_KEYS = [
  'description',
  'overview',
  'summary',
  'storyline',
  'genres',
  'genre',
  'tagline',
] as const

/** 화면에 그대로 노출되는 값. 한국어가 섞여 들어오면 영문 화면에서 걷어 낸다. */
const DISPLAY_TEXT_KEYS = [...STORED_KO_KEYS, 'publisher'] as const

/**
 * 영문 화면에서는 저장된 한국어 값을 덜어 내고 외부에서 받아온 영문 값을 살린다.
 * 국문 화면은 그대로 둔다 — 운영자가 손으로 고친 값이 여기에 들어 있다.
 */
export function stripLocalizedMeta(
  locale: string,
  stored: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!stored) return {}
  if (locale !== 'en') return stored
  return Object.fromEntries(
    Object.entries(stored).filter(
      ([key]) => !(STORED_KO_KEYS as readonly string[]).includes(key),
    ),
  )
}

function hasHangul(value: unknown): boolean {
  if (typeof value === 'string') return HANGUL_PATTERN.test(value)
  if (Array.isArray(value)) return value.some((item) => hasHangul(item))
  return false
}

/**
 * 병합을 마친 메타에서 화면 언어와 어긋나는 표시값을 버린다.
 *
 * 출처를 가려도 새는 자리가 남는다 — 카카오는 한국어 출판사만 주고, 저장된 장르는 ko-KR 응답 그대로다.
 * 값이 사라지면 화면은 그 줄을 비우거나 미확인으로 적는다. 한국어를 영문 화면에 싣는 것보다 낫다.
 */
export function dropForeignDisplayText<T extends object>(locale: string, meta: T | null): T | null {
  if (locale !== 'en' || !meta) return meta
  const out = { ...meta } as Record<string, unknown>
  for (const key of DISPLAY_TEXT_KEYS) {
    if (hasHangul(out[key])) delete out[key]
  }
  return out as T
}
