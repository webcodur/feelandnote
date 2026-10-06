export const BOOK_SEARCH_LANGUAGES = ['ko', 'en'] as const
export type BookSearchLanguage = typeof BOOK_SEARCH_LANGUAGES[number]

export const BOOK_SEARCH_PROVIDERS = {
  ko: { source: 'kakao_book', label: 'Kakao', url: 'https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide#search-book' },
  en: { source: 'openlibrary', label: 'Open Library', url: 'https://openlibrary.org/dev/docs/api/search' },
} as const

export function getBookSearchLanguage(value: string | null | undefined): BookSearchLanguage {
  return value === 'en' ? 'en' : 'ko'
}

/** Keep the selected edition language when opening a result from a different UI locale. */
export function getSearchContentHref(id: string, category: string, language?: BookSearchLanguage): string {
  const params = new URLSearchParams({ category })
  if (category === 'book' && language) params.set('bookLanguage', language)
  return `/content/${encodeURIComponent(id)}?${params}`
}
