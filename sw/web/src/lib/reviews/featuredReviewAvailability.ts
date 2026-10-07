import { isDisplayTitleRow, type ContentLocaleRow } from '@/lib/utils/content-locale'
import { normalizePurchaseIsbn, type Yes24BookDetail } from '@/lib/books/yes24Purchase'
import { featuredReviewHasEnoughText, type FeaturedReviewCandidate, type FeaturedReviewText } from './featuredReviewLength'

export interface FeaturedReviewBookCandidate extends FeaturedReviewCandidate, FeaturedReviewText {
  contents: { content_locales: ContentLocaleRow[] | null }
}

/** 한영 공통 추천은 두 화면 모두 실물 판본을 보여줄 수 있어야 한다. 검색 링크는 판매 근거가 아니다. */
export function featuredReviewEdition(locales: ContentLocaleRow[] | null, locale: 'ko' | 'en') {
  const row = locales?.find(row => row.locale === locale)
  if (!row?.title?.trim() || isDisplayTitleRow(row.sources)
    || (row.sources as { availability?: string } | null)?.availability === 'out_of_print') return null
  const isbn = normalizePurchaseIsbn(row.isbn ?? '')
  return isbn ? { ...row, isbn } : null
}

/** 기존 ISBN 판매 조회 캐시를 공유하고 중복 ISBN과 동시 요청을 제한한다. 실패 결과는 캐시하지 않는다. */
export async function availableFeaturedReviews<T extends FeaturedReviewBookCandidate>(
  candidates: readonly T[],
  readDetail: (isbn: string) => Promise<Yes24BookDetail | null>,
): Promise<T[]> {
  const editions = candidates.filter(featuredReviewHasEnoughText)
    .map(row => ({ row, ko: featuredReviewEdition(row.contents.content_locales, 'ko'), en: featuredReviewEdition(row.contents.content_locales, 'en') }))
    .filter(entry => entry.ko && entry.en)
  const isbns = [...new Set(editions.flatMap(entry => [entry.ko!.isbn, entry.en!.isbn]))]
  const sale = new Map<string, boolean>()
  let next = 0
  let failures = 0
  await Promise.all(Array.from({ length: Math.min(4, isbns.length) }, async () => {
    while (next < isbns.length) {
      const isbn = isbns[next++]
      try {
        const detail = await readDetail(isbn)
        sale.set(isbn, !!detail && detail.isbn === isbn && detail.onSale && !!detail.purchaseUrl)
      } catch {
        failures++
        sale.set(isbn, false)
      }
    }
  }))
  if (failures) console.warn(`홈 주목할 만한 감상: 판매 확인에 실패한 ISBN ${failures}개를 이번 조회에서 제외했습니다.`)
  return editions.filter(entry => sale.get(entry.ko!.isbn) && sale.get(entry.en!.isbn)).map(entry => entry.row)
}
