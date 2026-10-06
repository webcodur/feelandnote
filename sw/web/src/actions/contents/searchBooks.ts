'use server'

import { getLocale } from 'next-intl/server'
import { getBookSearchLanguage, type BookSearchLanguage } from '@feelandnote/content-search/book-search-language'
import { searchBookCatalogCached } from '@/lib/books/bookSearch.server'

interface SearchBooksParams {
  query: string
  page?: number
  bookLanguage?: BookSearchLanguage
  locale?: string
}

export async function searchBooks({ query, page = 1, bookLanguage, locale }: SearchBooksParams) {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }

  const language = bookLanguage ?? getBookSearchLanguage(locale ?? await getLocale())
  return searchBookCatalogCached(query.trim(), language, page)
}
