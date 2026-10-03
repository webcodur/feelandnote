'use server'
import { getPublicUserContents } from '@/actions/contents/getUserContents'
import { findAffiliateLink } from '@/actions/home/affiliateLinks'
import { figureBookToShelfBook, type BookShelfBook } from '@/components/shared/BookShelf/types'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import { getCelebReferenceBooks, type CelebReferenceBooks } from './getCelebReferenceBooks'

/** 가상독백 책장. 상세의 분류를 유지하면서 공개 도서 감상을 추가한다. */

export type CelebBookShelf = CelebReferenceBooks & { readBooks: BookShelfBook[] }

const httpsUrl = (value: unknown) => (typeof value === 'string' && value.startsWith('https://') ? value : '')

/** 등장·집필·직군·소속 자료와 감상 도서를 같은 책장에 표시하되 분류는 보존한다. */
export async function getCelebBookShelf(
  celebId: string,
  locale: string = 'ko',
): Promise<CelebBookShelf> {
  const [reference, readRecords] = await Promise.all([
    getCelebReferenceBooks(celebId, locale),
    getPublicUserContents({ userId: celebId, type: 'BOOK', limit: 500 }, locale),
  ])
  const appeared = reference.appeared.filter(book => book.type === 'BOOK')
  const authored = reference.authored.filter(book => book.type === 'BOOK')
  const related = new Map([...appeared, ...authored].map(book => [book.id, figureBookToShelfBook(book)]))
  const read: BookShelfBook[] = readRecords.items.map((record) => {
    // 리뷰 전문은 고른 책만 읽는다. 책장 응답에 모든 감상문을 중복해서 싣지 않는다.
    const readingRecord = { ...record, public_record: null }
    const existing = related.get(record.content_id)
    if (existing) return { ...existing, readingRecord }
    const platform = locale === 'en' ? 'amazon' : 'coupang'
    const link = findAffiliateLink(record.content.affiliate_url, platform)
    const url = httpsUrl(record.content.affiliate_url)
    return {
      id: record.content_id,
      title: record.content.title,
      creator: record.content.creator,
      thumbnailUrl: record.content.thumbnail_url,
      editions: [],
      isbn: locale === 'en' ? record.content.isbn_en : record.content.isbn_ko,
      affiliateLinks: link ? [link] : url ? [{ platform, url }] : [],
      titleBadge: record.content.title_badge,
      readingRecord,
    }
  })
  return { ...reference, appeared, authored, readBooks: read.filter(isBookShelfAvailable) }
}
