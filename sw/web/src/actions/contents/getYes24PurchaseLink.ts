'use server'

import { unstable_cache } from 'next/cache'
import type { AffiliateLink } from '@/constants/affiliatePlatforms'
import { createStaticClient } from '@/lib/db/static'
import { rawFetch } from '@/lib/rawFetch'
import { getCachedYes24BookDetail } from '@/lib/books/yes24DetailCache'
import {
  fetchYes24Purchase, isYes24PurchaseRequest, normalizePurchaseIsbn,
  selectYes24Purchase, selectYes24Sales, yes24PurchaseEnabled, YES24_PURCHASE_CACHE_SECONDS,
  type Yes24SalesInfo,
} from '@/lib/books/yes24Purchase'

// Errors escape this callback so an outage cannot replace a successful cached lookup.
const getPurchase = unstable_cache(
  (isbn: string) => fetchYes24Purchase(rawFetch, isbn, process.env.YES24_API_KEY ?? ''),
  ['yes24-purchase-isbn-v3-comics'],
  { revalidate: YES24_PURCHASE_CACHE_SECONDS },
)

/** 작품 유형과 판본 소속·언어를 DB에서 확인해 저장 ISBN을 정한다. 요청이 틀렸거나 꺼져 있으면 null */
async function resolveStoredIsbn(contentId: string, locale: string, editionId?: number): Promise<string | null> {
  if (!isYes24PurchaseRequest(contentId, locale, editionId) || !yes24PurchaseEnabled(process.env)) return null
  const db = createStaticClient()
  const { data: content, error: contentError } = await db.from('contents')
    .select('id,type').eq('id', contentId).eq('type', 'BOOK').maybeSingle()
  if (contentError) throw new Error('Purchase content lookup failed')
  if (!content || content.id !== contentId || content.type !== 'BOOK') return null

  const query = editionId === undefined
    ? db.from('content_locales').select('content_id,locale,isbn').eq('content_id', contentId).eq('locale', locale)
    : db.from('figure_book_editions').select('id,content_id,locale,isbn').eq('id', editionId).eq('content_id', contentId).eq('locale', locale)
  const { data: edition, error: editionError } = await query.maybeSingle()
  if (editionError) throw new Error('Purchase edition lookup failed')
  if (!edition || edition.content_id !== contentId || edition.locale !== locale) return null
  if (editionId !== undefined && (!('id' in edition) || edition.id !== editionId)) return null
  return normalizePurchaseIsbn(edition.isbn)
}

export async function getYes24PurchaseLink(contentId: string, locale: string, editionId?: number): Promise<AffiliateLink | null> {
  try {
    const isbn = await resolveStoredIsbn(contentId, locale, editionId)
    return isbn ? selectYes24Purchase(await getPurchase(isbn)) : null
  } catch {
    return null
  }
}

/** 인물 화면 연관 작품에서 고른 판본의 YES24 판매 정보. 판매중이 아니거나 확인할 수 없으면 null */
export async function getYes24SalesInfo(contentId: string, locale: string, editionId: number): Promise<Yes24SalesInfo | null> {
  try {
    const isbn = await resolveStoredIsbn(contentId, locale, editionId)
    return isbn ? selectYes24Sales(await getCachedYes24BookDetail(isbn)) : null
  } catch {
    return null
  }
}
