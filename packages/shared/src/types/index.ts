/**
 * @deprecated status 컬럼은 더 이상 사용하지 않음. 리뷰(rating/review) 유무로 감상 여부 판단.
 * - 관심: rating IS NULL AND review IS NULL
 * - 감상완료: rating IS NOT NULL OR review IS NOT NULL
 */
export type ContentStatus = 'WANT' | 'FINISHED'

// 콘텐츠 타입
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'

// 셀럽 직업 타입
export type CelebProfession =
  | 'leader'
  | 'politician'
  | 'commander'
  | 'entrepreneur'
  | 'investor'
  | 'scientist'
  | 'humanities_scholar'
  | 'social_scientist'
  | 'director'
  | 'musician'
  | 'visual_artist'
  | 'author'
  | 'actor'
  | 'influencer'
  | 'athlete'

// 국가 정보 타입
export interface Country {
  name: string
  code: string
}
