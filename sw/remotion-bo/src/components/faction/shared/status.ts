import type { FactionStatus } from '@/lib/faction-types'

/** 상태 선택 옵션 — 할 일 / 공개 / 완료 */
export const FACTION_STATUS_OPTIONS: { value: FactionStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'live', label: 'Live' },
  { value: 'done', label: 'Done' },
]

/** 상태 점 색 */
export const FACTION_STATUS_DOT: Record<FactionStatus, string> = {
  todo: 'bg-amber-500',
  live: 'bg-blue-500',
  done: 'bg-green-500',
}
