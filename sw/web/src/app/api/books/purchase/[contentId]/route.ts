import { getYes24PurchaseLink } from '@/actions/contents/getYes24PurchaseLink'
import { createStaticClient } from '@/lib/db/static'
import { isYes24PurchaseRequest } from '@/lib/books/yes24Purchase'
import { excludedBookEditionReason, reviewedBookWorkSelectionReason } from '@feelandnote/content-search/book-edition-policy'
import { toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { AFFILIATE_PLATFORMS, toAffiliateLinks, type AffiliateLink } from '@/constants/affiliatePlatforms'
import { getEnglishBookPurchaseLinks } from '@/lib/books/amazonBookSearch'
import {
  BOOK_PURCHASE_REDIRECT_HEADERS, getBookPurchaseFallback, resolveAladinPurchaseRedirect,
  resolveBookPurchaseRedirect, resolveCoupangPurchaseRedirect, resolveKyoboPurchaseRedirect, type BookPurchaseRecord,
} from '@/lib/books/bookPurchaseRedirect'

export const dynamic = 'force-dynamic'
type Seller = 'yes24' | 'kyobo' | 'coupang' | 'aladin' | 'amazon'
type StoredPurchase = BookPurchaseRecord & { links: AffiliateLink[] }

function storedLink(link: AffiliateLink): boolean {
  try {
    const url = new URL(link.url)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}

function redirect(url: string): Response {
  return new Response(null, { status: 307, headers: { ...BOOK_PURCHASE_REDIRECT_HEADERS, Location: url } })
}
function invalid(): Response {
  return new Response('Invalid book purchase request', { status: 400, headers: BOOK_PURCHASE_REDIRECT_HEADERS })
}

async function getStoredPurchase(contentId: string, localeName: 'ko' | 'en', seller: Seller, editionId?: number): Promise<StoredPurchase | null> {
  const db = createStaticClient()
  const { data: content, error } = await db.from('contents').select('id,type,metadata').eq('id', contentId).eq('type', 'BOOK').maybeSingle()
  if (error) throw new Error('Purchase content unavailable')
  if (!content || content.id !== contentId || content.type !== 'BOOK') return null
  if (reviewedBookWorkSelectionReason({ contentId, metadata: content.metadata })) return null
  const { data: locale, error: localeError } = await db.from('content_locales')
    .select('content_id,locale,isbn,title,creator,publisher,sources,affiliate_url').eq('content_id', contentId).eq('locale', localeName).maybeSingle()
  if (localeError) throw new Error('Purchase locale unavailable')
  if (locale && (locale.content_id !== contentId || locale.locale !== localeName)) return null
  if (editionId === undefined) {
    if (!locale || excludedBookEditionReason({ ...locale, contentId })) return null
    return { contentId, type: content.type, locale: localeName, links: toAffiliateLinks(locale.affiliate_url),
      isbn: locale?.isbn, title: locale?.title, creator: locale?.creator }
  }
  const { data: edition, error: editionError } = await db.from('figure_book_editions')
    .select('id,content_id,locale,isbn,title,creator,publisher,release_date,sources,edition_kind,text_scope').eq('id', editionId).eq('content_id', contentId).eq('locale', localeName).maybeSingle()
  if (editionError) throw new Error('Purchase edition unavailable')
  if (!edition || edition.id !== editionId || edition.content_id !== contentId || edition.locale !== localeName) return null
  if (excludedBookEditionReason({ ...edition, contentId, editionKind: edition.edition_kind, textScope: edition.text_scope })) return null
  const isbn = typeof edition.isbn === 'string' ? toIsbn13(edition.isbn) : null
  const sameLocaleIsbn = !!(locale && isbn && typeof locale.isbn === 'string' && isbn === toIsbn13(locale.isbn))
  if (sameLocaleIsbn && excludedBookEditionReason({ ...locale, contentId })) return null
  const links = sameLocaleIsbn ? toAffiliateLinks(locale?.affiliate_url) : []
  if (seller === 'coupang' || seller === 'amazon') {
    const { data: product, error: productError } = await db.from('figure_book_purchase_options')
      .select('edition_id,content_id,locale,isbn,platform,affiliate_url').eq('edition_id', editionId)
      .eq('content_id', contentId).eq('locale', localeName).eq('platform', seller).maybeSingle()
    if (productError) throw new Error('Purchase product unavailable')
    if (product) {
      if (product.edition_id !== editionId || product.content_id !== contentId || product.locale !== localeName
        || product.platform !== seller || product.isbn !== edition.isbn || typeof product.affiliate_url !== 'string') return null
      links.unshift({ platform: seller, url: product.affiliate_url })
    }
  }
  return { contentId, type: content.type, locale: edition.locale, editionId, links,
    isbn: edition.isbn, title: edition.title, creator: edition.creator }
}

export async function GET(request: Request, context: { params: Promise<{ contentId: string }> }): Promise<Response> {
  const { contentId } = await context.params
  const params = new URL(request.url).searchParams
  const rawEdition = params.get('editionId')
  const rawSeller = params.get('seller')
  const locale = params.get('locale') ?? 'ko'
  const seller = rawSeller ?? (locale === 'en' ? 'amazon' : 'yes24')
  if ([...params.keys()].some(key => key !== 'editionId' && key !== 'seller' && key !== 'locale') || params.getAll('editionId').length > 1
    || params.getAll('locale').length > 1 || !['ko', 'en'].includes(locale)
    || params.getAll('seller').length > 1 || !(locale === 'en' ? seller === 'amazon' : ['yes24', 'kyobo', 'coupang', 'aladin'].includes(seller))
    || (rawEdition !== null && !/^[1-9]\d*$/.test(rawEdition))) return invalid()
  const editionId = rawEdition === null ? undefined : Number(rawEdition)
  if (!isYes24PurchaseRequest(contentId, 'ko', editionId)) return invalid()
  try {
    const record = await getStoredPurchase(contentId, locale as 'ko' | 'en', seller as Seller, editionId)
    if (!record) return invalid()
    const saved = record.links.find(link => link.platform === seller && AFFILIATE_PLATFORMS[link.platform]?.locale === locale && storedLink(link))
    if (locale === 'en') {
      const amazon = getEnglishBookPurchaseLinks({ ...record, links: saved ? [saved] : [] }).find(link => link.platform === 'amazon')
      return amazon ? redirect(amazon.url) : invalid()
    }
    if (saved) return redirect(saved.url)
    const target = rawSeller === 'kyobo'
      ? resolveKyoboPurchaseRedirect(contentId, editionId, record)
      : rawSeller === 'coupang'
        ? resolveCoupangPurchaseRedirect(contentId, editionId, record)
        : rawSeller === 'aladin'
          ? resolveAladinPurchaseRedirect(contentId, editionId, record)
          : await resolveBookPurchaseRedirect(contentId, editionId, record, () => getYes24PurchaseLink(contentId, 'ko', editionId))
    return target ? redirect(target) : invalid()
  } catch {
    return redirect(getBookPurchaseFallback(contentId))
  }
}
