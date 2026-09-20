import { getYes24PurchaseLink } from '@/actions/contents/getYes24PurchaseLink'
import { createStaticClient } from '@/lib/db/static'
import { isYes24PurchaseRequest } from '@/lib/books/yes24Purchase'
import {
  BOOK_PURCHASE_REDIRECT_HEADERS, getBookPurchaseFallback, resolveBookPurchaseRedirect,
  resolveCoupangPurchaseRedirect, resolveKyoboPurchaseRedirect, type BookPurchaseRecord,
} from '@/lib/books/bookPurchaseRedirect'

export const dynamic = 'force-dynamic'

function redirect(url: string): Response {
  return new Response(null, { status: 307, headers: { ...BOOK_PURCHASE_REDIRECT_HEADERS, Location: url } })
}
function invalid(): Response {
  return new Response('Invalid book purchase request', { status: 400, headers: BOOK_PURCHASE_REDIRECT_HEADERS })
}

async function getStoredPurchase(contentId: string, editionId?: number): Promise<BookPurchaseRecord | null> {
  const db = createStaticClient()
  const { data: content, error } = await db.from('contents').select('id,type').eq('id', contentId).eq('type', 'BOOK').maybeSingle()
  if (error) throw new Error('Purchase content unavailable')
  if (!content || content.id !== contentId || content.type !== 'BOOK') return null
  if (editionId === undefined) {
    const { data: locale, error: localeError } = await db.from('content_locales')
      .select('content_id,locale,isbn,title,creator').eq('content_id', contentId).eq('locale', 'ko').maybeSingle()
    if (localeError) throw new Error('Purchase locale unavailable')
    if (locale && (locale.content_id !== contentId || locale.locale !== 'ko')) return null
    return { contentId, type: content.type, locale: 'ko',
      isbn: locale?.isbn, title: locale?.title, creator: locale?.creator }
  }
  const { data: edition, error: editionError } = await db.from('figure_book_editions')
    .select('id,content_id,locale,isbn,title,creator').eq('id', editionId).eq('content_id', contentId).eq('locale', 'ko').maybeSingle()
  if (editionError) throw new Error('Purchase edition unavailable')
  if (!edition || edition.id !== editionId || edition.content_id !== contentId || edition.locale !== 'ko') return null
  return { contentId, type: content.type, locale: edition.locale, editionId,
    isbn: edition.isbn, title: edition.title, creator: edition.creator }
}

export async function GET(request: Request, context: { params: Promise<{ contentId: string }> }): Promise<Response> {
  const { contentId } = await context.params
  const params = new URL(request.url).searchParams
  const rawEdition = params.get('editionId')
  const rawSeller = params.get('seller')
  if ([...params.keys()].some(key => key !== 'editionId' && key !== 'seller') || params.getAll('editionId').length > 1
    || params.getAll('seller').length > 1 || (rawSeller !== null && rawSeller !== 'yes24' && rawSeller !== 'kyobo' && rawSeller !== 'coupang')
    || (rawEdition !== null && !/^[1-9]\d*$/.test(rawEdition))) return invalid()
  const editionId = rawEdition === null ? undefined : Number(rawEdition)
  if (!isYes24PurchaseRequest(contentId, 'ko', editionId)) return invalid()
  try {
    const record = await getStoredPurchase(contentId, editionId)
    const target = rawSeller === 'kyobo'
      ? resolveKyoboPurchaseRedirect(contentId, editionId, record)
      : rawSeller === 'coupang'
        ? resolveCoupangPurchaseRedirect(contentId, editionId, record)
        : await resolveBookPurchaseRedirect(contentId, editionId, record, () => getYes24PurchaseLink(contentId, 'ko', editionId))
    return target ? redirect(target) : invalid()
  } catch {
    return redirect(getBookPurchaseFallback(contentId))
  }
}
