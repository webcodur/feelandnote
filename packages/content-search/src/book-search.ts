import { searchBooks as searchKakaoBooks } from './kakao-books'
import { searchOpenLibraryBooks } from './openlibrary-search'
import type { BookSearchLanguage } from './book-search-language'

export async function searchBookCatalog(query: string, language: BookSearchLanguage, page = 1) {
  if (!query.trim()) return { items: [], total: 0, hasMore: false }
  if (language !== 'ko' && language !== 'en') throw new Error('Unsupported book search language')
  return language === 'en' ? searchOpenLibraryBooks(query, page) : searchKakaoBooks(query, page)
}
