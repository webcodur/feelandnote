'use server'

import { unstable_cache } from 'next/cache'
import type { AffiliateLink } from '@/constants/affiliatePlatforms'
import { createStaticClient } from '@/lib/db/static'
import { rawFetch } from '@/lib/rawFetch'
import {
  fetchYes24Purchase, isYes24PurchaseRequest, normalizePurchaseIsbn,
  selectYes24Purchase, yes24PurchaseEnabled, YES24_PURCHASE_CACHE_SECONDS,
} from '@/lib/books/yes24Purchase'

// Errors escape this callback so an outage cannot replace a successful cached lookup.
const getPurchase = unstable_cache(
  (isbn: string) => fetchYes24Purchase(rawFetch, isbn, process.env.YES24_API_KEY ?? ''),
  ['yes24-purchase-isbn-v2-addon'],
  { revalidate: YES24_PURCHASE_CACHE_SECONDS },
)

export async function getYes24PurchaseLink(contentId: string, locale: string, editionId?: number): Promise<AffiliateLink | null> {
  if (!isYes24PurchaseRequest(contentId, locale, editionId) || !yes24PurchaseEnabled(process.env)) return null
  try {
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
    const isbn = normalizePurchaseIsbn(edition.isbn)
    if (!isbn) return null
    return selectYes24Purchase(await getPurchase(isbn))
  } catch {
    return null
  }
}
