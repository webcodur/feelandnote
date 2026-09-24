'use server'
import { getFigureBooksForCeleb } from '@/actions/figure-books/getFigureBooks'
import { getPublicUserContents } from '@/actions/contents/getUserContents'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { findAffiliateLink } from '@/actions/home/affiliateLinks'
import { isShelfSellable, mapRelatedFigureBooksToAffiliateBooks } from '@/components/features/celeb/CelebRelatedAffiliateBooks'
import { getEnglishBookAmazonUrl } from '@/lib/books/amazonBookSearch'

/* ── 인물 책장 ──
   가상독백 카드 아래에 붙는 인물 관련 도서 모음. 저서(인물이 쓴 책)·연관 도서(인물이 등장하거나
   다뤄진 작품)·읽은 책(인물 감상 기록) 세 묶음을 상품 선반(AffiliateBook) 형태로 돌려준다.
   한국어는 YES24가 찾을 ISBN 판본이 판매 기준이고 쿠팡은 같은 판본의 보조 링크다.
   영문은 아마존 상품 주소가 없으면 제목·저자 검색으로 잇는다. */

export interface CelebBookShelf {
  authored: AffiliateBook[]
  related: AffiliateBook[]
  read: AffiliateBook[]
}

const httpsUrl = (value: unknown) => (typeof value === 'string' && value.startsWith('https://') ? value : '')

/** 인물의 판촉 도서 묶음 — 저서·연관·읽은 책 순. 읽은 책은 readLimit만큼만 받는다 */
export async function getCelebBookShelf(
  celebId: string,
  locale: string = 'ko',
  readLimit = 12,
): Promise<CelebBookShelf> {
  const [figureBooks, readRecords] = await Promise.all([
    getFigureBooksForCeleb(celebId, locale),
    getPublicUserContents({ userId: celebId, type: 'BOOK', limit: readLimit }, locale),
  ])

  const isEn = locale === 'en'
  const authored = mapRelatedFigureBooksToAffiliateBooks(
    figureBooks.filter((book) => book.relationType === 'authored'),
    locale,
    { includeAuthored: true },
  )
  const related = mapRelatedFigureBooksToAffiliateBooks(
    figureBooks.filter((book) => book.relationType !== 'authored'),
    locale,
  )

  // 저서·연관으로 이미 선 책은 읽은 책에서 뺀다 — 같은 표지가 구분선을 건너 두 번 서지 않게
  const seen = new Set([...authored, ...related].map((book) => book.contentId))
  const read = readRecords.items.flatMap((record): AffiliateBook[] => {
    if (seen.has(record.content_id)) return []
    seen.add(record.content_id)
    const stored = httpsUrl(record.content.affiliate_url)
      || findAffiliateLink(record.content.affiliate_url, isEn ? 'amazon' : 'coupang')?.url
      || ''
    return [{
      contentId: record.content_id,
      title: record.content.title,
      creator: record.content.creator || undefined,
      thumbnail: record.content.thumbnail_url || undefined,
      url: isEn
        ? getEnglishBookAmazonUrl({ title: record.content.title, creator: record.content.creator, url: stored || null })
        : stored,
      titleBadge: record.content.title_badge,
    }]
  })

  // 「번역본 없음」·「절판」 띠가 붙는 책은 판촉 선반에 세우지 않는다 — 지금 화면 말로 살 수 없는 책이라 아예 뺀다
  return {
    authored: authored.filter(isShelfSellable),
    related: related.filter(isShelfSellable),
    read: read.filter(isShelfSellable),
  }
}
