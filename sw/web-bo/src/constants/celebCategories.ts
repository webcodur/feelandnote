// 공유 패키지에서 re-export (하위 호환성 유지)
export {
  CELEB_PROFESSIONS,
  getCelebProfessionLabel,
} from '@feelnnote/shared/constants/celeb-professions'
export type { CelebProfession } from '@feelnnote/shared/types'

// 하위 호환성을 위한 별칭 (deprecated)
import { CELEB_PROFESSIONS, getCelebProfessionLabel } from '@feelnnote/shared/constants/celeb-professions'
/** @deprecated CELEB_PROFESSIONS 사용 */
export const CELEB_CATEGORIES = CELEB_PROFESSIONS
/** @deprecated getCelebProfessionLabel 사용 */
export const getCelebCategoryLabel = getCelebProfessionLabel
