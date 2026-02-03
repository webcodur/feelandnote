'use server'

import { searchBooks as searchNaverBooks } from '@feelandnote/content-search/naver-books'

interface SearchBooksParams {
  query: string
  page?: number
}

export async function searchBooks({ query, page = 1 }: SearchBooksParams) {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }

  return searchNaverBooks(query, page)
}
