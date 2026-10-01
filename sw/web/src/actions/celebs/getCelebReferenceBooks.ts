'use server'

import { getPublicUserContents } from '@/actions/contents/getUserContents'
import { getFigureBookPresentationsForCeleb } from '@/actions/figure-books/getFigureBookPresentations'
import { getProfessionPeerBooks, type AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { mapReadContentsToAffiliateBooks } from '@/components/features/celeb/CelebRelatedAffiliateBooks'
import { CELEB_READ_BOOKS_PAGE_SIZE, getDisplayFigureBookGroups } from '@/lib/celeb/authoredBooks'
import { createStaticClient } from '@/lib/db/static'
import { getCelebFactionBooks } from './getCelebFactionBooks'

const READ_SHELF_TARGET = 12
const READ_SHELF_MAX_PAGES = 5
const PROFESSION_SHELF_LIMIT = 24

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
  const db = createStaticClient()
  const [profileResult, figureBooks] = await Promise.all([
    db.from('celebs').select('celeb_tier, profession').eq('id', celebId).single(),
    getFigureBookPresentationsForCeleb(celebId, locale),
  ])
  if (profileResult.error) throw profileResult.error
  const groups = getDisplayFigureBookGroups(figureBooks)
  const read = profileResult.data.celeb_tier === 'full'
    ? await getCelebReadShelf(celebId, locale)
    : { books: [] as AffiliateBook[], nextPage: 1, hasMore: false }
  // 직군 — 같은 직군 동료들이 남긴 기록 중 팔리는 책. 등장·감상·집필이 이미 보여 주는 책은 뺀다
  const profession = (profileResult.data.profession as string | null) ?? null
  const excludeIds = new Set<string>([
    ...groups.appeared.map((book) => book.id),
    ...groups.authored.map((book) => book.id),
    ...read.books.map((book) => book.contentId),
  ])
  const [professionBooks, factionGroups] = await Promise.all([
    profession
      ? getProfessionPeerBooks(profession, locale === 'en' ? 'en' : 'ko', [celebId], excludeIds, PROFESSION_SHELF_LIMIT)
      : Promise.resolve([] as AffiliateBook[]),
    getCelebFactionBooks(celebId, locale),
  ])
  return { ...groups, read, profession, professionBooks, factionGroups }
}

export type CelebReferenceBooks = Awaited<ReturnType<typeof getCelebReferenceBooks>>
