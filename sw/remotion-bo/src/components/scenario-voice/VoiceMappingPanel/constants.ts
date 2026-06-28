import type { SaveScope } from './types'

export const SAVE_SCOPE_LABEL: Record<SaveScope, string> = {
  episode: '이 에피소드만 (JSON)',
  db: '인물 전체 (DB만)',
  both: '둘 다 (DB + 이 에피소드)',
}

// 패싯·정렬 라벨은 공용 모듈에 둔다(세력도 콤보박스와 공유). 기존 호출부 이름을 유지하려 별칭 re-export.
export {
  FACET_ORDER,
  FACET_LABEL_KO,
  FACET_VALUE_KO,
  facetLabel,
  facetValueLabel,
  ELE_SORT_LABEL as SORT_LABEL,
} from '@/components/voice-utils'
export type { EleSortKey as SortKey } from '@/components/voice-utils'
