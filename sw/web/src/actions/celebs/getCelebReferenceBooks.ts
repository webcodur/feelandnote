'use server'

import { getPublicUserContents } from '@/actions/contents/getUserContents'
import { getFigureBookPresentationsForCeleb } from '@/actions/figure-books/getFigureBookPresentations'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { mapReadContentsToAffiliateBooks } from '@/components/features/celeb/CelebRelatedAffiliateBooks'
import { CELEB_READ_BOOKS_PAGE_SIZE, getDisplayFigureBookGroups } from '@/lib/celeb/authoredBooks'
import { createStaticClient } from '@/lib/db/static'

const READ_SHELF_TARGET = 12
const READ_SHELF_MAX_PAGES = 5

// 상세 페이지와 모달 모두 같은 첫 묶음을 받고 같은 쪽부터 더 보기를 잇는다.
export async function getCelebReadShelf(userId: string, locale: string) {
  const seen = new Set<string>()
  const books: AffiliateBook[] = []
  let nextPage = 1
  let hasMore = false
  for (let page = 1; page <= READ_SHELF_MAX_PAGES && books.length < READ_SHELF_TARGET; page += 1) {
    const result = await getPublicUserContents({
      userId, type: 'BOOK', page, limit: CELEB_READ_BOOKS_PAGE_SIZE, sortBy: 'recent',
    }, locale)
    for (const book of mapReadContentsToAffiliateBooks(result.items, locale === 'en' ? 'en' : 'ko')) {
      if (seen.has(book.contentId)) continue
      seen.add(book.contentId)
      books.push(book)
    }
    nextPage = page + 1
    hasMore = result.hasMore
    if (!hasMore) break
  }
  return { books, nextPage, hasMore }
}

export async function getCelebReferenceBooks(celebId: string, locale: string) {
  const readPromise = (async () => {
    const { data, error } = await createStaticClient().from('celebs').select('celeb_tier').eq('id', celebId).single()
    if (error) throw error
    return data.celeb_tier === 'full'
      ? getCelebReadShelf(celebId, locale)
      : { books: [] as AffiliateBook[], nextPage: 1, hasMore: false }
  })()
  const [figureBooks, read] = await Promise.all([
    getFigureBookPresentationsForCeleb(celebId, locale), readPromise,
  ])
  return { ...getDisplayFigureBookGroups(figureBooks), read }
}

export type CelebReferenceBooks = Awaited<ReturnType<typeof getCelebReferenceBooks>>
