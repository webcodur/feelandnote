import { CATEGORIES } from '@/constants/categories'
import { RECORDS_PAGE_SIZE } from '@/app/[locale]/(reader)/celeb/[slug]/records/recordsPageData'
import { getPublicUserContents } from './getUserContents'
import type { ContentTypeCounts } from '@/types/content'

/** 인물 감상 뷰의 첫 응답. 홈과 상세가 같은 분류·순서·조회 크기를 쓴다. */
export function getInitialCelebContents(userId: string, counts: ContentTypeCounts, locale: string) {
  return getPublicUserContents({
    userId,
    type: CATEGORIES.find(category => counts[category.dbType] > 0)?.dbType ?? 'BOOK',
    page: 1,
    limit: 4,
    sortBy: 'recent',
  }, locale)
}

/** 감상 기록 전체 보기 첫 장과 같은 조회. 검색엔진용 작품 목록이 같은 작품·순서를 싣고 캐시를 함께 쓴다. */
export function getCelebRecordListContents(userId: string, locale: string) {
  return getPublicUserContents({ userId, page: 1, limit: RECORDS_PAGE_SIZE, sortBy: 'recent' }, locale)
}
