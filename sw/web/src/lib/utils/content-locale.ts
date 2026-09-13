// content_locales 테이블 헬퍼

/**
 * content_locales SELECT 필드 (상세 페이지용 - 전체 필드)
 * description/publisher/isbn/affiliate_url 포함. 상세 페이지·수정 화면에서만 사용.
 */
export const CL_SELECT = 'locale, title, creator, thumbnail_url, description, isbn, publisher, affiliate_url, sources'

/**
 * 경량 SELECT (리스트·피드·카드용)
 * description/publisher/isbn/affiliate_url 제외 → egress 절약.
 * sources는 표시용 제목 행 판정에 필요하며 JSONB 100바이트 안쪽이다.
 * flattenLocales는 누락 필드를 null로 안전 처리한다.
 */
export const CL_SELECT_LIST = 'locale, title, creator, thumbnail_url, sources'

/** 셀럽 감상 목록에서 구매 동선까지 그릴 때 쓰는 경량 SELECT. */
export const CL_SELECT_LIST_WITH_AFFILIATE = `${CL_SELECT_LIST}, affiliate_url`

export interface ContentLocaleRow {
  locale: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  description?: string | null
  isbn?: string | null
  publisher?: string | null
  affiliate_url?: unknown
  sources?: unknown
}

/** 요청 locale의 제목이 확인된 판본 제목이 아닐 때 붙는 배지. out-of-print는 절판·유통 판본 없음(sources.availability). */
export type TitleBadge = 'no-ko' | 'no-en' | 'out-of-print'

/** sources JSONB에서 표시용 제목 표기만 좁혀 읽는다. */
interface LocaleSources {
  primary?: unknown
  title?: unknown
  /** 'out_of_print' — 절판이거나 유통 판본이 확인되지 않은 원어 작품(celeb-02-02 「절판」) */
  availability?: unknown
}

/** 표시용 제목 행이면 true — sources.title이 'translated'·'romanized' 같은 표기를 갖는다. */
/** 표시용 제목 행의 표식 값. celeb-02-02 「한국어판 확인」·「영문판과 표지」가 허용값을 쥔다. */
const DISPLAY_TITLE_MARKS = new Set(['translated', 'romanized', 'original'])

function isDisplayTitleRow(sources: unknown): boolean {
  if (!sources || typeof sources !== 'object') return false
  // sources.title은 옛 등록 경로가 「제목 필드의 출처 URL」로도 쓰던 키다(3,788행). 값이 표식일 때만 표시행으로 본다.
  const { title, primary } = sources as LocaleSources & { primary?: unknown }
  return primary === 'none' && typeof title === 'string' && DISPLAY_TITLE_MARKS.has(title)
}

/**
 * 요청 locale의 제목 배지 판정
 * 1) 요청 locale 행이 없거나 title이 비어 반대 언어로 폴백했다
 * 2) 요청 locale 행이 표시용 제목 행이다
 */
function resolveTitleBadge(
  row: ContentLocaleRow | undefined,
  requested: 'ko' | 'en',
): TitleBadge | null {
  // 절판 표식은 판본 확인 여부보다 먼저 본다 — 원어 작품이라 「번역본 없음」이 아니라 「절판」이 맞다.
  if (row?.title && (row.sources as LocaleSources | null | undefined)?.availability === 'out_of_print') return 'out-of-print'
  // 제목 유무 판정은 아래 폴백과 같은 기준을 쓴다 — 값이 있으면 폴백하지 않는다.
  const isConfirmed = !!row?.title && !isDisplayTitleRow(row.sources)
  return isConfirmed ? null : (requested === 'en' ? 'no-en' : 'no-ko')
}

/**
 * content_locales 배열 → 플랫 shape 변환
 * locale을 전달하면 해당 locale 우선, 미전달 시 ko 우선 (하위호환)
 */
export function flattenLocales(locales: ContentLocaleRow[] | null | undefined, locale?: string) {
  const ko = locales?.find(l => l.locale === 'ko')
  const en = locales?.find(l => l.locale === 'en')
  const requested = locale === 'en' ? 'en' : 'ko'
  const primary = locale === 'en' ? en : ko
  const fallback = locale === 'en' ? ko : en
  return {
    title_badge: resolveTitleBadge(primary, requested),
    title: primary?.title || fallback?.title || '',
    creator: primary?.creator || fallback?.creator || null,
    thumbnail_url: primary?.thumbnail_url || fallback?.thumbnail_url || null,
    description: primary?.description || fallback?.description || null,
    publisher: primary?.publisher || fallback?.publisher || null,
    isbn: primary?.isbn || fallback?.isbn || null,
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
    case 'kakao_book': case 'aladin': case 'tmdb': return 'ko'
    case 'google_books': case 'openlibrary': case 'igdb': case 'itunes': return 'en'
    default: return 'ko'
  }
}

/**
 * BOOK 등록 시 언어 행의 locale. 카카오·알라딘은 수입 원서(영문 제목)도 돌려주는데 그것을 ko 행에 넣으면
 * 한국어 화면에 영문 제목이 나가고 언어 카드 정비가 그 행을 지운다(26.09.10 실측). 제목에 한글이 없으면 en 으로 담는다.
 */
export function resolveBookLocale(source: string | null | undefined, title: string | null | undefined): string {
  const base = sourceToLocale(source)
  if (base === 'ko' && title && !/[가-힣]/.test(title)) return 'en'
  return base
}

/** external_source → sources JSONB */
export function sourceToJsonb(source: string | null | undefined): Record<string, string> {
  return { primary: source || 'unknown' }
}
