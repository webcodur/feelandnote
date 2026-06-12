// content_locales 테이블 헬퍼

/**
 * content_locales SELECT 필드 (상세 페이지용 - 전체 필드)
 * description/publisher/isbn/affiliate_url 포함. 상세 페이지·수정 화면에서만 사용.
 */
export const CL_SELECT = 'locale, title, creator, thumbnail_url, description, isbn, publisher, affiliate_url'

/**
 * 경량 SELECT (리스트·피드·카드용)
 * description/publisher/isbn/affiliate_url 제외 → egress 절약.
 * flattenLocales는 누락 필드를 null로 안전 처리한다.
 */
export const CL_SELECT_LIST = 'locale, title, creator, thumbnail_url'

export interface ContentLocaleRow {
  locale: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  description?: string | null
  isbn?: string | null
  publisher?: string | null
  affiliate_url?: unknown
}

/**
 * content_locales 배열 → 플랫 shape 변환
 * locale을 전달하면 해당 locale 우선, 미전달 시 ko 우선 (하위호환)
 */
export function flattenLocales(locales: ContentLocaleRow[] | null | undefined, locale?: string) {
  const ko = locales?.find(l => l.locale === 'ko')
  const en = locales?.find(l => l.locale === 'en')
  const primary = locale === 'en' ? en : ko
  const fallback = locale === 'en' ? ko : en
  return {
    title: primary?.title || fallback?.title || '',
    creator: primary?.creator || fallback?.creator || null,
    thumbnail_url: primary?.thumbnail_url || fallback?.thumbnail_url || null,
    description: primary?.description || fallback?.description || null,
    publisher: primary?.publisher || fallback?.publisher || null,
    title_ko: ko?.title || null,
    title_en: en?.title || null,
    creator_en: en?.creator || null,
    isbn_ko: ko?.isbn || null,
    isbn_en: en?.isbn || null,
    thumbnail_ko: ko?.thumbnail_url || null,
    thumbnail_en: en?.thumbnail_url || null,
    has_en_edition: en?.title != null,
    affiliate_url: primary?.affiliate_url || fallback?.affiliate_url || null,
  }
}

/** external_source → 기본 locale */
export function sourceToLocale(source: string | null | undefined): string {
  switch (source) {
    case 'naver_book': case 'qnet': case 'tmdb': return 'ko'
    case 'google_books': case 'igdb': case 'spotify': return 'en'
    default: return 'ko'
  }
}

/** external_source → sources JSONB */
export function sourceToJsonb(source: string | null | undefined): Record<string, string> {
  return { primary: source || 'unknown' }
}
