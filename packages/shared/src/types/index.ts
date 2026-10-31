/** 감상 여부의 정본. WANT는 기존 DB·열린 탭과 호환되는 '감상 안함' 저장값이다. */
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
