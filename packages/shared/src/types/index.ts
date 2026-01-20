// 콘텐츠 상태 타입 (관심/감상 2가지)
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
  | 'scholar'
  | 'artist'
  | 'author'
  | 'actor'
  | 'influencer'
  | 'athlete'

// 국가 정보 타입
export interface Country {
  name: string
  code: string
}
