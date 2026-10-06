import { unstable_cache } from 'next/cache'
import { searchBookCatalog } from '@feelandnote/content-search/book-search'
import { getOpenLibraryBookMetadata } from '@feelandnote/content-search/openlibrary'
import { toOpenLibrarySearchResult } from '@feelandnote/content-search/openlibrary-search'
import { toIsbn13 } from '@feelandnote/content-search/book-isbn'

// Language selects the provider and is an argument in the cache key. Errors propagate and are not cached as zero results.
export const searchBookCatalogCached = unstable_cache(searchBookCatalog, ['book-catalog-search-v1'], { revalidate: 300 })
export const getEnglishBookMetadataCached = unstable_cache(getOpenLibraryBookMetadata, ['english-book-edition-v1'], { revalidate: 3600 })

export async function getEnglishBookResult(rawIsbn: string) {
  const isbn = toIsbn13(rawIsbn)
  if (!isbn) return null
  const book = await getEnglishBookMetadataCached(isbn)
  return book ? toOpenLibrarySearchResult(book) : null
}
