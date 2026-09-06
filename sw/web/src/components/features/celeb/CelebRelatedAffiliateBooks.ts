import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import { getFigureBookPurchasePlatform } from '@/actions/figure-books/figureBookLocale'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'

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

    const edition = book.editions.find((item) => (
      item.platform === platform
      && item.title.trim() !== ''
      && item.purchaseUrl?.startsWith('https://')
    ))
    if (!edition?.purchaseUrl) continue

    seen.add(book.id)
    books.push({
      contentId: book.id,
      title: edition.title,
      creator: edition.creator ?? undefined,
      thumbnail: edition.thumbnailUrl ?? undefined,
      url: edition.purchaseUrl,
    })
  }
  return books
}
