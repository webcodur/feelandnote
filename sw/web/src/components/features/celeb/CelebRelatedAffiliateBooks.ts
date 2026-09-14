import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import { getFigureBookPurchasePlatform } from '@/actions/figure-books/figureBookLocale'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
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
      item.title.trim() !== ''
      && (item.platform === platform || (locale === 'ko' && item.platform === null))
    ))
    const linkedEdition = candidates.find((item) => (
      item.platform === platform && item.purchaseUrl?.startsWith('https://')
    ))
    // 언어별로 선정된 판본에서 고른다. 한국어는 ISBN만 있어도 YES24로 연결할 수 있다.
    const edition = linkedEdition ?? (locale === 'ko'
      ? candidates.find((item) => normalizePurchaseIsbn(item.isbn))
      : undefined)
    if (!edition) continue

    seen.add(book.id)
    books.push({
      contentId: book.id,
      editionId: edition.id,
      title: edition.title,
      creator: edition.creator ?? undefined,
      thumbnail: edition.thumbnailUrl ?? undefined,
      url: linkedEdition?.purchaseUrl ?? '',
    })
  }
  return books
}
