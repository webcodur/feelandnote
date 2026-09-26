import type { UserContentPublic } from '@/actions/contents/getUserContents'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import { getFigureBookPurchasePlatform } from '@/actions/figure-books/figureBookLocale'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { findAffiliateLink } from '@/actions/home/affiliateLinks'
import { getEnglishBookAmazonUrl } from '@/lib/books/amazonBookSearch'
import { normalizePurchaseIsbn } from '@/lib/books/yes24Purchase'

export function mapRelatedFigureBooksToAffiliateBooks(
  relatedBooks: FigureBookContent[],
  locale: string,
  options?: { includeAuthored?: boolean },
): AffiliateBook[] {
  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform) return []

  const books: AffiliateBook[] = []
  const seen = new Set<string>()
  for (const book of relatedBooks) {
    // 인물 저서는 상세 「창작」탭 몫이라 상품 선반에서는 기본으로 뺀다 — 창작 탭이 없는 화면(가상독백 카드)은 includeAuthored로 되살린다
    if ((book.relationType === 'authored' && !options?.includeAuthored) || book.type !== 'BOOK' || seen.has(book.id)) continue

    const candidates = book.editions.filter((item) => (
      item.title.trim() !== '' && (item.platform === platform || item.platform === null)
    ))
    const productOf = (item: (typeof candidates)[number]) => (
      item.platform === platform && item.purchaseUrl?.startsWith('https://') ? item.purchaseUrl : ''
    )
    // 한국어는 YES24가 상품을 찾을 ISBN 판본이 기준이고, 쿠팡 상품은 그 판본에 붙는 보조 링크다.
    // 영어는 아마존 상품이 걸린 판본이 먼저고, 없으면 아마존 검색으로 잇는다.
    const edition = locale === 'ko'
      ? candidates.find((item) => normalizePurchaseIsbn(item.isbn)) ?? candidates.find(productOf)
      : candidates.find(productOf) ?? candidates[0]
    if (!edition) continue
    const url = locale === 'en'
      ? getEnglishBookAmazonUrl({ title: edition.title, creator: edition.creator, url: productOf(edition) || null })
      : productOf(edition)
    if (locale === 'en' && !url) continue

    seen.add(book.id)
    books.push({
      contentId: book.id,
      editionId: edition.id,
      title: edition.title,
      creator: edition.creator ?? undefined,
      thumbnail: edition.thumbnailUrl ?? undefined,
      url,
      // 판매 판본을 골랐으니 번역본 없음은 해당하지 않는다 — 절판만 표지 띠로 알린다
      titleBadge: book.titleBadge === 'out-of-print' ? book.titleBadge : null,
    })
  }
  return books
}

/** 판촉 선반에 세울 수 있는 책 — 「번역본 없음」·「절판」 띠가 붙으면 지금 화면 말로 살 수 없어 뺀다 */
export const isShelfSellable = (book: AffiliateBook) => book.titleBadge == null

/**
 * 감상 기록의 책 → 「감상」 상품 선반. 인물이 실제로 읽은 책을 구매 카드로 모은다.
 * 판매대라 살 수 없는 책(요청 언어판 없음·절판 — title_badge)은 세우지 않는다.
 * 한국어는 YES24가 contentId·ISBN으로 상품을 찾고 쿠팡은 보조 링크, 영어는 아마존 상품 또는 검색으로 잇는다.
 */
export function mapReadContentsToAffiliateBooks(
  items: readonly UserContentPublic[],
  locale: 'ko' | 'en',
): AffiliateBook[] {
  const books: AffiliateBook[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const content = item.content
    if (content.type !== 'BOOK' || seen.has(content.id) || content.title_badge != null) continue
    seen.add(content.id)

    const title = locale === 'en' ? (content.title_en ?? content.title) : (content.title_ko ?? content.title)
    const url = locale === 'en'
      ? getEnglishBookAmazonUrl({
          title,
          creator: content.creator_en ?? content.creator,
          url: findAffiliateLink(content.affiliate_url, 'amazon')?.url ?? null,
        })
      : findAffiliateLink(content.affiliate_url, 'coupang')?.url ?? ''
    if (locale === 'en' && !url) continue

    books.push({
      contentId: content.id,
      title,
      creator: (locale === 'en' ? content.creator_en : null) ?? content.creator ?? undefined,
      thumbnail: (locale === 'en' ? content.thumbnail_en : null) ?? content.thumbnail_url ?? undefined,
      url,
      isbn: (locale === 'en' ? content.isbn_en : content.isbn_ko) ?? undefined,
    })
  }
  return books
}
