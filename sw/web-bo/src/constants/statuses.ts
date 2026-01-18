// 공유 패키지에서 re-export (하위 호환성 유지)
export {
  STATUS_CONFIG,
  STATUS_OPTIONS,
  getStatusLabel,
  getStatusColor,
} from '@feelnnote/shared/constants/statuses'
export type { ContentStatus } from '@feelnnote/shared/types'
export type { StatusOption, StatusConfig } from '@feelnnote/shared/constants/statuses'
