// 네이버 도서 검색 API 래퍼

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET
const NAVER_BOOK_API_URL = 'https://openapi.naver.com/v1/search/book.json'

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
  externalSource: 'naver'
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

  const params = new URLSearchParams({
    query,
    display: String(display),
    start: String(start)
  })

  const response = await fetch(`${NAVER_BOOK_API_URL}?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
    }
  })

  if (!response.ok) {
    throw new Error(`네이버 API 오류: ${response.status}`)
  }

  const data: NaverSearchResponse = await response.json()

  return {
    items: data.items.map((book) => ({
      externalId: book.isbn || book.link,
      externalSource: 'naver' as const,
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
