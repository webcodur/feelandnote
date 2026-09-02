// 카카오(다음) 도서 검색 API 래퍼 — BOOK 메타의 유일한 한국어 출처
//
// 네이버 도서 검색 API가 2026-07-31자로 종료되어(공지 32564) 그 자리를 대신하며,
// 네이버 래퍼와 그 전용 스크립트는 전량 제거했다.
// 상세: docs/project/platform/external-services.md 「외부 콘텐츠 검색 API」

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
const KAKAO_BOOK_API_URL = 'https://dapi.kakao.com/v3/search/book'

interface KakaoBook {
  title: string
  contents: string
  url: string
  isbn: string // "ISBN10 ISBN13" 공백 구분. 한쪽만 있는 경우도 있다
  datetime: string // ISO 8601
  authors: string[]
  publisher: string
  translators: string[]
  price: number
  sale_price: number
  thumbnail: string
  status: string // 정상판매 / 품절 / 절판 등. 빈 문자열도 온다
}

interface KakaoSearchResponse {
  documents: KakaoBook[]
  meta: {
    total_count: number
    pageable_count: number
    is_end: boolean
  }
}

export interface KakaoBookSearchResult {
  externalId: string
  externalSource: 'kakao_book'
  category: 'book'
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: {
    publisher: string
    publishDate: string
    isbn: string
    genre: string
    description: string
    link: string
    /** 정상판매 / 품절 / 절판 등. 서점 실재 확인에 쓴다 */
    salesStatus: string
  }
}

export interface KakaoBookIsbnLookup {
  book: KakaoBookSearchResult
  /** 다음 책 상세에서 복원한 전체 소개. 검색 API 요약만 있으면 null이다. */
  fullDescription: string | null
}

const ISBN13_PATTERN = /^97[89]\d{10}$/

// "8954655971 9788954655972" → 13자리 우선
function pickIsbn(raw: string): string {
  const candidates = (raw || '').split(/\s+/).filter(Boolean)
  return candidates.find(c => ISBN13_PATTERN.test(c)) || candidates[0] || ''
}

// 검색어가 ISBN 하나로만 이루어졌는지 (10자리 또는 13자리)
function isIsbnQuery(query: string): boolean {
  const compact = query.replace(/[\s-]/g, '')
  return /^\d{9}[\dXx]$/.test(compact) || ISBN13_PATTERN.test(compact)
}

// 카카오 썸네일은 R120x174로 작다. fname에 담긴 원본 주소를 꺼내 고화질을 쓴다.
function toCoverUrl(thumbnail: string): string | null {
  if (!thumbnail) return null

  const fname = new URL(thumbnail).searchParams.get('fname')
  if (!fname) return thumbnail

  try {
    const origin = new URL(fname)
    // 원본은 http로 오는 경우가 많다. next/image·CSP를 고려해 https로 승격
    origin.protocol = 'https:'
    return origin.toString()
  } catch {
    return thumbnail
  }
}

function formatPubDate(datetime: string): string {
  if (!datetime) return ''
  return datetime.slice(0, 10) // 2019-04-17T00:00:00.000+09:00 → 2019-04-17
}

function normalizeCreatorName(name: string): string {
  return decodeHtmlEntities(name)
    .trim()
    .replace(/[?？]+$/u, '')
    .replace(/\s*\([^)]*[A-Za-z][^)]*\)\s*$/u, '')
    .replace(/^([가-힣·.\s]+?)\s+[A-Za-z][A-Za-zÀ-ÖØ-öø-ÿ.'’\-\s]+$/u, '$1')
    .trim()
}

// 저자 + 번역자 표기 (번역자는 원저자와 구분해 붙인다)
export function normalizeKakaoBookCreator(authors: string[], translators: string[]): string {
  const normalizedAuthors = (authors || [])
    .map(normalizeCreatorName)
    .filter(Boolean)
    .filter((name, index, names) => names.indexOf(name) === index)
  const written = normalizedAuthors.join(', ')
  if (written) return written
  const translated = (translators || [])
    .map(normalizeCreatorName)
    .filter(Boolean)
    .filter((name, index, names) => names.indexOf(name) === index)
    .join(', ')
  return translated ? `${translated} (역)` : ''
}

// 본제목만 추출 (부제목 분리)
export function normalizeKakaoBookTitle(title: string, creator = ''): string {
  let mainTitle = title
  // 일부 데이터는 한국어 제목 뒤에 원제와 저자를 한 덩어리로 붙인다.
  mainTitle = mainTitle.replace(/\s+(?:_|[|｜])\s+[A-Za-z][\s\S]*?\s+by\s+[A-Za-z][\s\S]*$/iu, '')
  mainTitle = mainTitle.replace(/(?<=[가-힣])\.\s*[A-Za-z][\s\S]*?,?\s+by\s+[A-Za-z][\s\S]*$/iu, '')
  mainTitle = mainTitle.replace(/^(.+?)[,，]\s*[가-힣·.\s]{2,}:\s*[A-Za-z][\s\S]*$/u, '$1')
  mainTitle = mainTitle.replace(/^(.+?)\.\s+[A-Z][a-zÀ-ÖØ-öø-ÿ.'’\-]+(?:\s+[A-Z][a-zÀ-ÖØ-öø-ÿ.'’\-]+)+$/u, '$1')
  mainTitle = mainTitle.replace(/\s*\([^)]+\)\s*$/, '')
  const subtitle = mainTitle.match(/^(.+?)\s*[-–—]\s+(.+)$/u)
  if (subtitle) {
    const compact = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    // 하이픈 앞이 저자명뿐인 선집은 잘라내면 제목 대신 저자명만 남으므로 원문을 보존한다.
    if (!creator || compact(subtitle[1]) !== compact(creator)) mainTitle = subtitle[1]
  }
  return mainTitle.trim()
}

function toResult(book: KakaoBook): KakaoBookSearchResult {
  const isbn = pickIsbn(book.isbn)
  const creator = normalizeKakaoBookCreator(book.authors, book.translators)

  return {
    externalId: isbn || book.url,
    externalSource: 'kakao_book',
    category: 'book',
    title: normalizeKakaoBookTitle(book.title, creator),
    creator,
    coverImageUrl: toCoverUrl(book.thumbnail),
    metadata: {
      publisher: book.publisher,
      publishDate: formatPubDate(book.datetime),
      isbn,
      genre: '',
      description: book.contents,
      link: book.url,
      salesStatus: book.status,
    },
  }
}

const HTML_ENTITY_PATTERN = /&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

function decodeHtmlEntities(text: string): string {
  return text.replace(HTML_ENTITY_PATTERN, (source, entity: string) => {
    if (!entity.startsWith('#')) return NAMED_HTML_ENTITIES[entity.toLowerCase()] ?? source

    const isHex = entity[1]?.toLowerCase() === 'x'
    const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10)
    return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : source
  })
}

/** 다음 모바일 책 상세의 소개 본문을 일반 텍스트로 복원한다. */
export function parseDaumBookDescription(html: string): string | null {
  const match = html.match(
    /<div[^>]+class=["'][^"']*\binfo_desc\b[^"']*["'][^>]*>[\s\S]*?<p[^>]+class=["'][^"']*\bdesc\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
  )
  if (!match?.[1]) return null

  const text = decodeHtmlEntities(
    match[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text || null
}

function getDaumMobileDetailUrl(bookUrl: string): string | null {
  try {
    const source = new URL(bookUrl)
    const bookId = source.searchParams.get('bookId')
    if (!bookId) return null

    const detail = new URL('https://m.search.daum.net/search')
    detail.searchParams.set('w', 'bookpage')
    detail.searchParams.set('bookId', bookId)
    detail.searchParams.set('tab', 'introduction')
    detail.searchParams.set('q', source.searchParams.get('q') ?? '')
    return detail.toString()
  } catch {
    return null
  }
}

async function fetchFullBookDescription(bookUrl: string): Promise<string | null> {
  const detailUrl = getDaumMobileDetailUrl(bookUrl)
  if (!detailUrl) return null

  try {
    const response = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    return parseDaumBookDescription(await response.text())
  } catch {
    return null
  }
}

async function fetchBooks(params: URLSearchParams): Promise<{
  items: KakaoBookSearchResult[]
  total: number
  hasMore: boolean
}> {
  const response = await fetch(`${KAKAO_BOOK_API_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY!}` },
  })

  if (!response.ok) {
    throw new Error(`카카오 도서 API 오류: ${response.status}`)
  }

  const data: KakaoSearchResponse = await response.json()
  const documents = data.documents || []

  return {
    items: documents.map(toResult),
    total: data.meta?.total_count ?? documents.length,
    hasMore: !(data.meta?.is_end ?? true),
  }
}

/**
 * 도서 검색.
 *
 * 검색어가 ISBN 하나뿐이면 ISBN 지정 검색으로 전환한다.
 * (콘텐츠 상세·메타 재조회가 ISBN을 그대로 넘기므로 정확도가 올라간다)
 */
export async function searchBooks(
  query: string,
  page: number = 1
): Promise<{
  items: KakaoBookSearchResult[]
  total: number
  hasMore: boolean
}> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error('카카오 API 키가 설정되지 않았습니다. .env 파일에 KAKAO_REST_API_KEY를 설정해주세요.')
  }

  const size = 20
  // 카카오는 page 1~50만 허용한다
  const safePage = Math.min(Math.max(page, 1), 50)

  if (isIsbnQuery(query)) {
    return fetchBooks(
      new URLSearchParams({
        query: query.replace(/[\s-]/g, ''),
        target: 'isbn',
        size: String(size),
        page: String(safePage),
      })
    )
  }

  // "제목 - 저자" 형식은 하이픈을 공백으로 바꿔 통합 질의한다
  const normalizedQuery = query.trim().replace(/\s*[-–—]\s*/g, ' ')

  return fetchBooks(
    new URLSearchParams({
      query: normalizedQuery,
      size: String(size),
      page: String(safePage),
      sort: 'accuracy',
    })
  )
}

/** ISBN으로 단건 조회하고, 검색 요약과 구분되는 전체 소개를 함께 돌려준다. */
export async function getBookByIsbnWithFullDescription(
  isbn: string,
): Promise<KakaoBookIsbnLookup | null> {
  const compact = isbn.replace(/[\s-]/g, '')
  if (!compact) return null

  const result = await searchBooks(compact, 1)
  const book = (
    result.items.find(
      book => book.externalId === compact || book.metadata.isbn === compact
    ) ??
    result.items[0] ??
    null
  )
  if (!book) return null

  const fullDescription = await fetchFullBookDescription(book.metadata.link)
  if (!fullDescription || fullDescription.length <= book.metadata.description.length) {
    return { book, fullDescription }
  }

  return {
    fullDescription,
    book: {
      ...book,
      metadata: {
        ...book.metadata,
        description: fullDescription,
      },
    },
  }
}

/** ISBN으로 단건 조회. 없으면 null */
export async function getBookByIsbn(isbn: string): Promise<KakaoBookSearchResult | null> {
  return (await getBookByIsbnWithFullDescription(isbn))?.book ?? null
}
