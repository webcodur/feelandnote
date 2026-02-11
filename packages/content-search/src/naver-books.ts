// 네이버 도서 검색 API 래퍼

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET
const NAVER_BOOK_API_URL = 'https://openapi.naver.com/v1/search/book.json'
const NAVER_BOOK_ADV_API_URL = 'https://openapi.naver.com/v1/search/book_adv.json'

interface NaverBook {
  title: string
  link: string
  image: string
  author: string
  discount: string
  publisher: string
  pubdate: string
  isbn: string
  description: string
}

interface NaverSearchResponse {
  lastBuildDate: string
  total: number
  start: number
  display: number
  items: NaverBook[]
}

export interface BookSearchResult {
  externalId: string
  externalSource: 'naver_book'
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
  }
}

// 검색어에서 제목과 저자 분리 ("제목 - 저자" 형식 지원)
function parseSearchQuery(query: string): { title?: string; author?: string; raw: string } {
  const trimmed = query.trim()

  // " - " 패턴으로 분리 (제목 - 저자)
  const dashMatch = trimmed.match(/^(.+?)\s+[-–—]\s+(.+)$/)
  if (dashMatch) {
    return { title: dashMatch[1].trim(), author: dashMatch[2].trim(), raw: trimmed }
  }

  return { raw: trimmed }
}

async function fetchBooks(
  apiUrl: string,
  params: URLSearchParams,
  display: number,
  start: number
): Promise<{ items: BookSearchResult[]; total: number; hasMore: boolean }> {
  const response = await fetch(`${apiUrl}?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET!
    }
  })

  if (!response.ok) {
    throw new Error(`네이버 API 오류: ${response.status}`)
  }

  const data: NaverSearchResponse = await response.json()
  const items = data.items || []

  return {
    items: items.map((book) => ({
      externalId: book.isbn || book.link,
      externalSource: 'naver_book' as const,
      category: 'book' as const,
      title: extractMainTitle(book.title),
      creator: formatAuthor(book.author),
      coverImageUrl: book.image || null,
      metadata: {
        publisher: book.publisher,
        publishDate: formatPubDate(book.pubdate),
        isbn: book.isbn,
        genre: '',
        description: cleanHtml(book.description),
        link: book.link
      }
    })),
    total: data.total,
    hasMore: start + display < data.total
  }
}

export async function searchBooks(
  query: string,
  page: number = 1
): Promise<{
  items: BookSearchResult[]
  total: number
  hasMore: boolean
}> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error('네이버 API 키가 설정되지 않았습니다. .env 파일에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.')
  }

  const display = 20
  const start = (page - 1) * display + 1
  const parsed = parseSearchQuery(query)

  // 제목+저자 분리된 경우 고급 검색 먼저 시도
  if (parsed.title && parsed.author) {
    const advParams = new URLSearchParams({
      display: String(display),
      start: String(start),
      d_titl: parsed.title,
      d_auth: parsed.author
    })

    const advResult = await fetchBooks(NAVER_BOOK_ADV_API_URL, advParams, display, start)

    // 고급 검색 결과가 있으면 반환
    if (advResult.items.length > 0) {
      return advResult
    }

    // 결과 없으면 기본 검색으로 폴백 (하이픈 제거하고 검색)
  }

  // 기본 검색 (하이픈을 공백으로 치환)
  const normalizedQuery = parsed.raw.replace(/\s*[-–—]\s*/g, ' ')
  const params = new URLSearchParams({
    query: normalizedQuery,
    display: String(display),
    start: String(start)
  })

  return fetchBooks(NAVER_BOOK_API_URL, params, display, start)
}

// HTML 태그 제거 (네이버 API는 <b> 태그로 검색어를 감쌈)
function cleanHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

// 저자 포맷팅 (네이버 API는 여러 저자를 ^로 구분)
function formatAuthor(author: string): string {
  return cleanHtml(author).replace(/\^/g, ', ')
}

// 본제목만 추출 (부제목 분리)
function extractMainTitle(title: string): string {
  let mainTitle = cleanHtml(title)
  // 괄호로 감싼 부제목 제거: "본제목 (부제목)" → "본제목"
  mainTitle = mainTitle.replace(/\s*\([^)]+\)\s*$/, '')
  // 대시 뒤 부제목 제거: "본제목 - 부제목" → "본제목"
  mainTitle = mainTitle.replace(/\s*[-–—]\s+.+$/, '')
  return mainTitle.trim()
}

// pubdate 형식 변환 (20231128 -> 2023-11-28)
function formatPubDate(pubdate: string): string {
  if (pubdate.length === 8) {
    return `${pubdate.slice(0, 4)}-${pubdate.slice(4, 6)}-${pubdate.slice(6, 8)}`
  }
  return pubdate
}
