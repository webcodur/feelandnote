import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import { getFigureBookPurchasePlatform } from '@/actions/figure-books/figureBookLocale'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { getEnglishBookAmazonUrl } from '@/lib/books/amazonBookSearch'
import { normalizePurchaseIsbn } from '@/lib/books/yes24Purchase'

export function mapRelatedFigureBooksToAffiliateBooks(
  relatedBooks: FigureBookContent[],
  locale: string,
): AffiliateBook[] {
  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform) return []

  const books: AffiliateBook[] = []
  const seen = new Set<string>()
  for (const book of relatedBooks) {
    if (book.relationType !== 'related' || book.type !== 'BOOK' || seen.has(book.id)) continue

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
