import { toIsbn13 } from '@feelandnote/content-search/book-isbn'
import {
  isBookIntroductionSource,
  type BookIntroductionSource,
} from '@feelandnote/content-search/book-introduction-contract'
import { pickIntroForLocale } from './content-locale-text'

export interface BookIntroductionReference {
  isbn: string | null
  source: BookIntroductionSource
  sourceUrl: string | null
}

export interface BookIntroductionAttribution {
  provider: 'yes24' | 'kakao' | 'daum' | 'openlibrary' | 'feelandnote'
    | 'tmdb' | 'igdb' | 'itunes' | 'wikipedia' | 'lastfm' | 'ted' | 'mmorpg' | 'steam'
    | 'other' | 'unknown'
  url: string | null
  translated: boolean
}

interface StoredBookIntroduction {
  locale: string
  isbn?: string | null
  description?: string | null
  sources?: unknown
}

export interface BookIntroductionDisplay {
  description: string | null
  bookIntroduction: BookIntroductionReference | null
  introductionAttribution?: BookIntroductionAttribution
}

type SourceFields = { [key: string]: unknown }
const fields = (value: unknown): SourceFields => value && typeof value === 'object' && !Array.isArray(value)
  ? value as SourceFields : {}

function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value) || /[\u0000-\u0020\u007f\\]/.test(value)) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function bookIntroductionSourceUrl(sources: unknown): string | null {
  return safeSourceUrl(fields(sources).description)
}

function originalIntroductionUrl(sources: unknown, depth = 0): string | null {
  if (depth > 4) return null
  const source = fields(sources), description = fields(source.description)
  return bookIntroductionSourceUrl(source)
    ?? safeSourceUrl(description.url) ?? safeSourceUrl(description.sourceUrl) ?? safeSourceUrl(description.source_url)
    ?? originalIntroductionUrl(description.original_sources, depth + 1)
}

const MARKER_PROVIDER = { KAKAO: 'kakao', DAUM: 'daum', OPEN: 'openlibrary' } as const

function sourceProvider(url: string | null): BookIntroductionAttribution['provider'] {
  if (!url) return 'unknown'
  const host = new URL(url).hostname
  const domains = { 'yes24.com': 'yes24', 'kakao.com': 'kakao', 'daum.net': 'daum',
    'openlibrary.org': 'openlibrary', 'feelandnote.com': 'feelandnote',
    'themoviedb.org': 'tmdb', 'igdb.com': 'igdb', 'wikipedia.org': 'wikipedia',
    'last.fm': 'lastfm', 'ted.com': 'ted', 'mmorpg.com': 'mmorpg',
    'steampowered.com': 'steam', 'apple.com': 'itunes' } as const
  for (const [domain, provider] of Object.entries(domains)) {
    if (host === domain || host.endsWith(`.${domain}`)) return provider
  }
  return 'other'
}

// 소개 번역에 보존된 원본 기록만 따른다. 표시용 제목의 공급처로 추정하지 않는다.
function translatedOriginalProvider(sources: unknown, depth = 0): BookIntroductionAttribution['provider'] {
  if (depth > 4) return 'unknown'
  const source = fields(sources), description = fields(source.description)
  const original = fields(description.original_sources)
  if (Object.keys(original).length) {
    const nested = translatedOriginalProvider(original, depth + 1)
    if (nested !== 'unknown') return nested
    const providers: Record<string, BookIntroductionAttribution['provider']> = {
      openlibrary: 'openlibrary', OPEN: 'openlibrary', kakao_book: 'kakao', kakao: 'kakao',
      KAKAO: 'kakao', daum: 'daum', DAUM: 'daum', yes24: 'yes24',
    }
    if (typeof original.primary === 'string' && providers[original.primary]) return providers[original.primary]
  }
  return sourceProvider(originalIntroductionUrl(source))
}

// 카카오 출처는 재조회용 API 주소(dapi)를 저장한다 — 인증 키 없이 열면 빈 화면이라
// 사람이 여는 링크는 같은 도서 데이터의 소비자 페이지인 다음 책 검색으로 바꾼다.
function introductionDisplayUrl(url: string | null): string | null {
  if (!url) return null
  const api = new URL(url)
  if (api.hostname !== 'dapi.kakao.com') return url
  if (api.pathname !== '/v3/search/book' || api.searchParams.get('target') !== 'isbn') return null
  const isbn = api.searchParams.get('query')
  if (!isbn) return null
  const page = new URL('https://search.daum.net/search')
  page.searchParams.set('w', 'book')
  page.searchParams.set('q', isbn)
  return page.toString()
}

function introductionAttribution(row: StoredBookIntroduction): BookIntroductionAttribution {
  const source = fields(row.sources), description = fields(source.description)
  const originalUrl = originalIntroductionUrl(source)
  const url = introductionDisplayUrl(originalUrl)
  // 예약값은 조회할 원천 자체다. 이전 본문에 남았던 번역 표식으로 바꾸지 않는다.
  if (isBookIntroductionSource(row.description)) return { provider: MARKER_PROVIDER[row.description], url, translated: false }
  const translationValues = [source.description_translation, source.descriptionTranslation]
  const methods = [source.description_method, description.type, description.method]
  const translated = translationValues.some(value => value === true || (typeof value === 'string'
    && /translat|summary_from|(?:ko|en)[_-]to[_-](?:ko|en)/i.test(value)))
    || methods.some(value => typeof value === 'string' && /translat/i.test(value))
    || (['ko', 'en'].includes(String(source.description_source_locale)) && source.description_source_locale !== row.locale)
  const manual = source.manual === true || methods.some(value => typeof value === 'string'
    && /^(manual|manually[-_]written|original[-_]writing|feelandnote|generated|rewrite|research)(?:[-_].*)?$/i.test(value))
  return { provider: translated ? translatedOriginalProvider(source) : manual ? 'feelandnote' : sourceProvider(originalUrl), url, translated }
}

/** 예약값은 지정된 원천만 조회한다. NULL은 다른 소개로 대체하지 않는다. */
export function bookIntroductionDisplay(
  locale: string,
  row: StoredBookIntroduction | null | undefined,
): BookIntroductionDisplay {
  const empty = { description: null, bookIntroduction: null }
  if (!row || row.locale !== locale) return empty
  if (!row.description) return empty
  if (isBookIntroductionSource(row.description)) {
    const source = row.description
    if ((locale === 'en') !== (source === 'OPEN')) return empty
    return {
      description: null,
      bookIntroduction: {
        isbn: normalizeBookIsbn(row.isbn),
        source,
        sourceUrl: bookIntroductionSourceUrl(row.sources),
      },
      introductionAttribution: introductionAttribution(row),
    }
  }
  const description = pickIntroForLocale(locale, [row.description])
  return { description, bookIntroduction: null, ...(description ? { introductionAttribution: introductionAttribution(row) } : {}) }
}

/* VIDEO·GAME·MUSIC은 쓰기 계약이 sources.description에 출처 URL을 남긴다 — 그 기록을 그대로 표기한다.
   URL이 없는 레거시 행은 external_source로 제공자를 복원하고, 외부 작품 페이지는 external_id로 재구성한다. */
export function mediaIntroductionAttribution(
  row: { locale: string; description?: string | null; sources?: unknown } | null | undefined,
  externalSource: string | null | undefined,
  externalId: string | null | undefined,
): BookIntroductionAttribution | null {
  // 화면에서 탈락한 다른 언어의 소개에 붙은 출처를 대체 본문의 출처로 쓰지 않는다.
  if (!row || !pickIntroForLocale(row.locale, [row.description])) return null
  const source = fields(row.sources)
  const url = safeSourceUrl(source.description) ?? safeSourceUrl(source.url)
    ?? externalSourceUrl(externalSource, externalId)
  const method = source.description_method
  const translated = method === 'translation'
    || (['ko', 'en'].includes(String(source.description_source_locale))
      && source.description_source_locale !== row.locale)
  // 조사 작성은 근거 문서의 도메인이 아니라 F&N이 쓴 소개다. 근거 주소는 원문 링크로 남긴다.
  if (method === 'research') return { provider: 'feelandnote', url, translated }
  return { provider: url ? sourceProvider(url) : legacyProvider(externalSource), url, translated }
}

function externalSourceUrl(externalSource: string | null | undefined, externalId: string | null | undefined): string | null {
  const tmdb = /^tmdb-(movie|tv)-(\d+)$/.exec(externalId ?? '')
  if (externalSource === 'tmdb' && tmdb) return `https://www.themoviedb.org/${tmdb[1]}/${tmdb[2]}`
  return null
}

function legacyProvider(externalSource: string | null | undefined): BookIntroductionAttribution['provider'] {
  return ({ tmdb: 'tmdb', igdb: 'igdb', itunes: 'itunes' } as const)[externalSource as 'tmdb'] ?? 'unknown'
}

/** 선택 판본이 있으면 그 행만 사용한다. 본문·출처를 대표 판본에서 보충하지 않는다. */
export function selectBookIntroduction(
  locale: string,
  edition: StoredBookIntroduction | null | undefined,
  localeRow: StoredBookIntroduction | null | undefined,
): BookIntroductionDisplay {
  return bookIntroductionDisplay(locale, edition ?? localeRow)
}

export function normalizeBookIsbn(value: string | null | undefined): string | null {
  const isbn = value?.replace(/[\s-]/g, '') ?? ''
  return toIsbn13(isbn) ? isbn.toUpperCase() : null
}

// 선택 판본 → 요청 언어의 판본 → 한국어 대표 ISBN 순서. 영문에 한국어 대표 ISBN을 쓰지 않는다.
export function resolveBookIsbn(
  locale: string,
  editionIsbn: string | null | undefined,
  localeIsbn: string | null | undefined,
  externalId?: string | null,
): string | null {
  return normalizeBookIsbn(editionIsbn) ?? normalizeBookIsbn(localeIsbn)
    ?? (locale === 'ko' ? normalizeBookIsbn(externalId) : null)
}
