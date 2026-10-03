import type { BookShelfBook } from '@/components/shared/BookShelf/types'

export const BOOK_SHELF_INLINE_PEOPLE = 3
export const BOOK_SHELF_SEARCH_THRESHOLD = 6

export function searchBookShelf(books: BookShelfBook[], query: string): BookShelfBook[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return books.filter((book) => {
    const text = `${book.title} ${book.creator ?? ''}`.toLowerCase()
    return terms.every((term) => text.includes(term))
  })
}
