// 공유 패키지에서 re-export (하위 호환성 유지)
export {
  CELEB_PROFESSIONS,
  CELEB_PROFESSION_FILTERS,
  getCelebProfessionLabel,
  getCelebProfession,
} from '@feelnnote/shared/constants/celeb-professions'
export type { CelebProfession } from '@feelnnote/shared/types'
