// 카카오(다음) 도서 검색 API 래퍼 — BOOK 메타의 유일한 한국어 출처
//
// 네이버 도서 검색 API가 2026-07-31자로 종료되어(공지 32564) 그 자리를 대신하며,
// 네이버 래퍼와 그 전용 스크립트는 전량 제거했다.
// 상세: docs/project/external-services.md 「외부 콘텐츠 검색 API」

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

// 저자 + 번역자 표기 (번역자는 원저자와 구분해 붙인다)
function formatCreator(authors: string[], translators: string[]): string {
  const written = (authors || []).filter(Boolean).join(', ')
  if (written) return written
  const translated = (translators || []).filter(Boolean).join(', ')
  return translated ? `${translated} (역)` : ''
}

// 본제목만 추출 (부제목 분리)
function extractMainTitle(title: string): string {
  let mainTitle = title
  mainTitle = mainTitle.replace(/\s*\([^)]+\)\s*$/, '')
  mainTitle = mainTitle.replace(/\s*[-–—]\s+.+$/, '')
  return mainTitle.trim()
}

function toResult(book: KakaoBook): KakaoBookSearchResult {
  const isbn = pickIsbn(book.isbn)

  return {
    externalId: isbn || book.url,
    externalSource: 'kakao_book',
    category: 'book',
    title: extractMainTitle(book.title),
    creator: formatCreator(book.authors, book.translators),
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

/** ISBN으로 단건 조회. 없으면 null */
export async function getBookByIsbn(isbn: string): Promise<KakaoBookSearchResult | null> {
  const compact = isbn.replace(/[\s-]/g, '')
  if (!compact) return null

  const result = await searchBooks(compact, 1)
  return (
    result.items.find(
      book => book.externalId === compact || book.metadata.isbn === compact
    ) ??
    result.items[0] ??
    null
  )
}
