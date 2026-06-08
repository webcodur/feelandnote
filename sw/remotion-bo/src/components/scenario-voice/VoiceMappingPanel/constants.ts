import type { SaveScope } from './types'

export const SAVE_SCOPE_LABEL: Record<SaveScope, string> = {
  episode: '이 에피소드만 (JSON)',
  db: '인물 전체 (DB만)',
  both: '둘 다 (DB + 이 에피소드)',
}
