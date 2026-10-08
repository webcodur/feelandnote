import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { pickPurchaseEdition, type FigureBookEdition } from '@/actions/figure-books/figureBookLocale'
import { findAffiliateLink } from '@/actions/home/affiliateLinks'
import { getEnglishBookAmazonUrl } from './amazonBookSearch'
import { flattenLocales, type ContentLocaleRow, type TitleBadge } from '@/lib/utils/content-locale'
import { getThemeBookTextScope } from '@/lib/figure-books/themeBooks'

/** 서점 링크 생성 여부와 별개로, 확인된 언어판만 책장에 세운다. */
export function isBookShelfAvailable(book: { titleBadge?: TitleBadge | null }): boolean {
  return book.titleBadge == null
}

/** 개인·신화·세력이 공유하는 작품별 대표 판본 선택과 노출 판정. */
export function resolveBookShelfBook(
  content: { id: string; type: string; content_locales: ContentLocaleRow[] | null },
  editions: FigureBookEdition[],
  locale: string,
  themeSlug?: string,
  allowLocaleEditionFallback = true,
): AffiliateBook | null {
  if (content.type !== 'BOOK') return null
  const flat = flattenLocales(content.content_locales, locale, 'BOOK')
  if (flat.title_badge === 'out-of-print') return null
  const textScope = getThemeBookTextScope(content.id, themeSlug)
  const edition = (textScope && editions.find((edition) => edition.textScope === textScope)) || pickPurchaseEdition(editions, locale)
  // 카탈로그 밖의 감상 도서는 확인된 locale을 쓴다. 표시용 번역 제목이나 다른 언어로 대체하지 않는다.
  if (!edition && (!allowLocaleEditionFallback || flat.title_badge)) return null
  const title = edition?.title || flat.title
  if (!title.trim()) return null
  const creator = edition?.creator ?? flat.creator
  const url = locale === 'en'
    ? getEnglishBookAmazonUrl({ title, creator, url: edition?.purchaseUrl ?? findAffiliateLink(flat.affiliate_url, 'amazon')?.url })
    : edition?.purchaseUrl ?? findAffiliateLink(flat.affiliate_url, 'coupang')?.url ?? ''
  return {
    contentId: content.id, editionId: edition?.id, title,
    creator: creator ?? undefined,
    thumbnail: (edition?.thumbnailUrl ?? flat.thumbnail_url) || undefined,
    isbn: (edition?.isbn ?? (locale === 'en' ? flat.isbn_en : flat.isbn_ko)) || undefined,
    url, titleBadge: null,
  }
}
