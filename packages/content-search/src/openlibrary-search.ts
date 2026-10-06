import { toIsbn13 } from './book-isbn'
import { getOpenLibraryBookMetadata, type OpenLibraryBookMetadata } from './openlibrary'
import { OPENLIBRARY_BASE_URL, requestOpenLibrary } from './openlibrary-request'

type SearchEdition = {
  key?: string; title?: string; isbn?: string[]; language?: string[]
  publisher?: string[]; publish_date?: string[]; cover_i?: number
}
type SearchWork = {
  key?: string; title?: string; author_name?: string[]
  editions?: { docs?: SearchEdition[] }
}
type SearchData = { numFound?: number; num_found?: number; docs?: SearchWork[] }

export type BookSearchMetadata = {
  isbn: string; publisher: string; publishDate: string | null; link: string
  description?: string; editionKey?: string; workKey?: string | null; workTitle?: string | null
  languages?: string[]; physical_format?: string | null
}
export type EnglishBookSearchResult = {
  externalId: string; externalSource: 'openlibrary'; category: 'book'
  title: string; creator: string; coverImageUrl: string | null; metadata: BookSearchMetadata
}

export function toOpenLibrarySearchResult(book: OpenLibraryBookMetadata): EnglishBookSearchResult {
  return {
    externalId: book.isbn, externalSource: 'openlibrary', category: 'book',
    title: book.title, creator: book.creator, coverImageUrl: book.coverImageUrl,
    metadata: {
      isbn: book.isbn, publisher: book.publisher, publishDate: book.publishDate, link: book.sourceUrl,
      editionKey: new URL(book.sourceUrl).pathname, workKey: book.workKey, workTitle: book.workTitle,
      languages: book.languages, physical_format: book.physicalFormat,
    },
  }
}

function toSearchResult(work: SearchWork): EnglishBookSearchResult | null {
  const edition = work.editions?.docs?.find(item =>
    /^\/books\/OL\d+M$/.test(item.key ?? '') && item.language?.includes('eng') && item.isbn?.some(isbn => toIsbn13(isbn)),
  )
  const isbn = edition?.isbn?.map(toIsbn13).find(Boolean)
  const title = edition?.title?.trim()
  const creator = work.author_name?.map(name => name.trim()).filter(Boolean).join(', ')
  if (!edition || !isbn || !title || !creator || !/^\/works\/OL\d+W$/.test(work.key ?? '')) return null
  return {
    externalId: isbn, externalSource: 'openlibrary', category: 'book', title, creator,
    coverImageUrl: edition.cover_i && edition.cover_i > 0 ? `https://covers.openlibrary.org/b/id/${edition.cover_i}-L.jpg` : null,
    metadata: {
      isbn, publisher: edition.publisher?.join(', ') ?? '', publishDate: edition.publish_date?.[0] ?? null,
      link: `${OPENLIBRARY_BASE_URL}${edition.key}`, editionKey: edition.key,
      workKey: work.key, workTitle: work.title, languages: ['/languages/eng'],
    },
  }
}

export async function searchOpenLibraryBooks(query: string, page = 1) {
  const isbn = toIsbn13(query.trim())
  if (isbn) {
    const book = await getOpenLibraryBookMetadata(isbn)
    return { items: book ? [toOpenLibrarySearchResult(book)] : [], total: book ? 1 : 0, hasMore: false }
  }
  const safePage = Math.max(1, Math.trunc(page) || 1)
  const limit = 20
  const params = new URLSearchParams({
    q: `(${query.trim()}) AND language:eng`, lang: 'en', page: String(safePage), limit: String(limit),
    fields: 'key,title,author_name,editions,editions.key,editions.title,editions.isbn,editions.language,editions.publisher,editions.publish_date,editions.cover_i',
  })
  const response = await requestOpenLibrary(`${OPENLIBRARY_BASE_URL}/search.json?${params}`)
  if (!response.ok) throw new Error(`OpenLibrary search API error: ${response.status}`)
  const data = await response.json() as SearchData
  if (!Array.isArray(data.docs)) throw new Error('Invalid OpenLibrary search response')
  const total = data.numFound ?? data.num_found ?? 0
  const seen = new Set<string>()
  const items = data.docs.map(toSearchResult).filter((book): book is EnglishBookSearchResult => {
    if (!book || seen.has(book.externalId)) return false
    seen.add(book.externalId)
    return true
  })
  // Provider totals count works, including ones with no usable ISBN. Pagination follows the raw page.
  return { items, total, hasMore: safePage * limit < total }
}
