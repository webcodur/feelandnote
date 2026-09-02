/**
 * @deprecated status 컬럼은 더 이상 사용하지 않음. 리뷰(rating/review) 유무로 감상 여부 판단.
 * - 관심: rating IS NULL AND review IS NULL
 * - 감상완료: rating IS NOT NULL OR review IS NOT NULL
 */
export type ContentStatus = 'WANT' | 'FINISHED'

// 콘텐츠 타입
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC'

// 셀럽 직군 타입은 표시 옵션의 값에서 파생한다.
export type { CelebProfession } from '../constants/celeb-professions'

// 국가 정보 타입
export interface Country {
  name: string
  name_en: string
  code: string
}
