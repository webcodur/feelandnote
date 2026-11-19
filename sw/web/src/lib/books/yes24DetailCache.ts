import 'server-only'

import { unstable_cache } from 'next/cache'
import { rawFetch } from '@/lib/rawFetch'
import {
  fetchYes24BookDetail, recheckYes24Miss, YES24_PURCHASE_CACHE_SECONDS, YES24_PURCHASE_MISS_RECHECK_SECONDS, type Yes24BookDetail,
} from './yes24Purchase'

// 서재 차트의 책 정보 모달과 인물 화면 연관 작품의 판매 정보가 같은 ISBN 조회를 나눠 쓴다.
// 실패는 던져 캐시에 남기지 않는다 — 성공한 조회만 하루 보관한다
export const getCachedYes24BookDetail = unstable_cache(
  (isbn: string) => fetchYes24BookDetail(rawFetch, isbn, process.env.YES24_API_KEY ?? ''),
  ['yes24-book-detail-v2-sales'],
  { revalidate: YES24_PURCHASE_CACHE_SECONDS },
)

// 판매중이 아니거나 상품이 없다는 결과만 구간마다 다시 묻는다. bucket은 키에만 쓰인다
const recheckYes24BookDetail = unstable_cache(
  (isbn: string, bucket: number) => (void bucket, fetchYes24BookDetail(rawFetch, isbn, process.env.YES24_API_KEY ?? '')),
  ['yes24-book-detail-recheck-v1'],
  { revalidate: YES24_PURCHASE_MISS_RECHECK_SECONDS },
)

/** 판매 상태를 보여 주는 화면용 — 하루 캐시가 「판매중 아님·없음」이면 구간 캐시로 다시 확인한다 */
export function getYes24BookDetailRechecked(isbn: string): Promise<Yes24BookDetail | null> {
  return recheckYes24Miss(() => getCachedYes24BookDetail(isbn), bucket => recheckYes24BookDetail(isbn, bucket),
    detail => !detail?.onSale)
}
