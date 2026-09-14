import type { AffiliateLink } from '@/constants/affiliatePlatforms'
import { normalizePurchaseIsbn } from './yes24Purchase'

export interface BookPurchaseRecord {
  contentId: string
  type: string
  locale: string
  editionId?: number
  isbn?: string | null
  title?: string | null
  creator?: string | null
}

export const BOOK_PURCHASE_REDIRECT_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
} as const

export function getBookPurchaseFallback(contentId: string): string {
  return `/content/${encodeURIComponent(contentId)}?category=book`
}

function yes24Search(record: BookPurchaseRecord): string {
  const isbn = normalizePurchaseIsbn(record.isbn)
  const query = isbn ?? [record.title, record.creator].filter(value => typeof value === 'string' && value.trim()).join(' ').trim()
  if (!query) return getBookPurchaseFallback(record.contentId)
  // Same official search path used by constants/platformLinks.ts; encode title/author safely.
  const url = new URL('https://www.yes24.com/Product/Search')
  url.search = new URLSearchParams({ domain: 'BOOK', query }).toString()
  return url.href
}

/** Return null for mismatched ownership; never buy a different edition as a fallback. */
export async function resolveBookPurchaseRedirect(
  contentId: string,
  editionId: number | undefined,
  record: BookPurchaseRecord | null,
  getYes24: () => Promise<AffiliateLink | null>,
): Promise<string | null> {
  if (!record || record.contentId !== contentId || record.type !== 'BOOK' || record.locale !== 'ko'
    || record.editionId !== editionId) return null
  try {
    const yes24 = await getYes24()
    if (yes24?.platform === 'yes24') return yes24.url // The ISBN lookup validates the exact YES24 product URL.
  } catch { /* The same seller's search remains usable when its API is unavailable. */ }
  return yes24Search(record)
}
