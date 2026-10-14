import { CATEGORIES } from '@/constants/categories'
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
