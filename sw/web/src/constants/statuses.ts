// 공유 패키지에서 re-export (하위 호환성 유지)
export {
  STATUS_CONFIG,
  STATUS_OPTIONS,
  STATUS_FILTER_OPTIONS,
  RECORD_STATUS_FILTER_OPTIONS,
  CELEB_STATUS_OPTIONS,
  getStatusLabel,
  getStatusColor,
  getStatusBgColor,
} from '@feelnnote/shared/constants/statuses'
export type {
  StatusConfig,
  StatusOption,
  StatusFilter,
  StatusFilterOption,
} from '@feelnnote/shared/constants/statuses'
