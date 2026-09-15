import 'server-only'

import { unstable_cache } from 'next/cache'
import { rawFetch } from '@/lib/rawFetch'
import { fetchYes24BookDetail, YES24_PURCHASE_CACHE_SECONDS } from './yes24Purchase'

// 서재 차트의 책 정보 모달과 인물 화면 연관 작품의 판매 정보가 같은 ISBN 조회를 나눠 쓴다.
// 실패는 던져 캐시에 남기지 않는다 — 성공한 조회만 하루 보관한다
export const getCachedYes24BookDetail = unstable_cache(
  (isbn: string) => fetchYes24BookDetail(rawFetch, isbn, process.env.YES24_API_KEY ?? ''),
  ['yes24-book-detail-v2-sales'],
  { revalidate: YES24_PURCHASE_CACHE_SECONDS },
)
