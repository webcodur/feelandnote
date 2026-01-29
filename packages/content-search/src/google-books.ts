// Google Books API 래퍼

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes'
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY

// #region Types
interface GoogleBookVolumeInfo {
  title: string
  subtitle?: string
  authors?: string[]
  publisher?: string
  publishedDate?: string
  description?: string
  industryIdentifiers?: Array<{
    type: 'ISBN_10' | 'ISBN_13' | 'OTHER'
    identifier: string
  }>
  imageLinks?: {
    smallThumbnail?: string
    thumbnail?: string
  }
  infoLink?: string
}

interface GoogleBookItem {
  id: string
  volumeInfo: GoogleBookVolumeInfo
}

interface GoogleBooksResponse {
  totalItems: number
  items?: GoogleBookItem[]
}

export interface GoogleBookSearchResult {
  externalId: string
  externalSource: 'google_books'
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
    volumeId: string
  }
}
// #endregion

// #region Search Functions
export async function searchGoogleBooks(
  query: string,
  page: number = 1
): Promise<{
  items: GoogleBookSearchResult[]
  total: number
  hasMore: boolean
}> {
  const maxResults = 20
  const startIndex = (page - 1) * maxResults

  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
    startIndex: String(startIndex),
    printType: 'books',
    langRestrict: 'en',
  })

  if (GOOGLE_BOOKS_API_KEY) {
    params.set('key', GOOGLE_BOOKS_API_KEY)
  }

  const response = await fetch(`${GOOGLE_BOOKS_API_URL}?${params}`)

  if (!response.ok) {
    throw new Error(`Google Books API 오류: ${response.status}`)
  }

  const data: GoogleBooksResponse = await response.json()

  if (!data.items) {
    return { items: [], total: 0, hasMore: false }
  }

  return {
    items: data.items.map(parseGoogleBook),
    total: data.totalItems,
    hasMore: startIndex + maxResults < data.totalItems
  }
}

// ISBN으로 단일 도서 조회
export async function getGoogleBookByIsbn(
  isbn: string
): Promise<GoogleBookSearchResult | null> {
  const params = new URLSearchParams({
    q: `isbn:${isbn}`,
    maxResults: '1',
  })

  if (GOOGLE_BOOKS_API_KEY) {
    params.set('key', GOOGLE_BOOKS_API_KEY)
  }

  const response = await fetch(`${GOOGLE_BOOKS_API_URL}?${params}`)

  if (!response.ok) {
    return null
  }

  const data: GoogleBooksResponse = await response.json()

  if (!data.items || data.items.length === 0) {
    return null
  }

  return parseGoogleBook(data.items[0])
}
// #endregion

// #region Helpers
function parseGoogleBook(item: GoogleBookItem): GoogleBookSearchResult {
  const info = item.volumeInfo
  const isbn = extractIsbn(info.industryIdentifiers)

  return {
    externalId: isbn || item.id,
    externalSource: 'google_books',
    category: 'book',
    title: info.title,
    creator: info.authors?.join(', ') || '',
    coverImageUrl: getHighResImageUrl(info.imageLinks?.thumbnail),
    metadata: {
      publisher: info.publisher || '',
      publishDate: info.publishedDate || '',
      isbn,
      genre: '',
      description: info.description || '',
      link: info.infoLink || `https://books.google.com/books?id=${item.id}`,
      volumeId: item.id,
    }
  }
}

// ISBN-13 우선, 없으면 ISBN-10
function extractIsbn(
  identifiers?: Array<{ type: string; identifier: string }>
): string {
  if (!identifiers) return ''

  const isbn13 = identifiers.find(id => id.type === 'ISBN_13')
  if (isbn13) return isbn13.identifier

  const isbn10 = identifiers.find(id => id.type === 'ISBN_10')
  if (isbn10) return isbn10.identifier

  return ''
}

// Google Books 썸네일 고해상도로 변환
function getHighResImageUrl(url?: string): string | null {
  if (!url) return null
  // zoom=1 → zoom=2로 변경하여 고해상도 이미지 요청
  return url.replace('zoom=1', 'zoom=2').replace('http://', 'https://')
}
// #endregion
