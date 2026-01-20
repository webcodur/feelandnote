// 공유 패키지에서 기본 상태 가져오기
export {
  STATUS_CONFIG,
  STATUS_OPTIONS,
  STATUS_FILTER_OPTIONS,
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

// #region 확장 상태 (레거시 호환용)
// 레거시 상태를 포함한 전체 상태 라벨 (Single Source of Truth)
export const STATUS_LABELS: Record<string, string> = {
  WANT: '관심',
  WATCHING: '진행중',
  DROPPED: '중단',
  FINISHED: '감상함',
  RECOMMENDED: '추천',
  NOT_RECOMMENDED: '비추',
}

// 레거시 상태를 포함한 전체 상태 스타일 (UI용)
export const STATUS_STYLES: Record<string, { class: string; text: string }> = {
  WANT: { class: 'text-yellow-300 border-yellow-600', text: STATUS_LABELS.WANT },
  WATCHING: { class: 'text-green-400 border-green-600', text: STATUS_LABELS.WATCHING },
  DROPPED: { class: 'text-red-400 border-red-600', text: STATUS_LABELS.DROPPED },
  FINISHED: { class: 'text-blue-400 border-blue-600', text: STATUS_LABELS.FINISHED },
  RECOMMENDED: { class: 'text-pink-400 border-pink-600', text: STATUS_LABELS.RECOMMENDED },
  NOT_RECOMMENDED: { class: 'text-gray-400 border-gray-600', text: STATUS_LABELS.NOT_RECOMMENDED },
}

// 내보내기용 상태 라벨
export const EXPORT_STATUS_LABELS: Record<string, string> = {
  WANT: '보고싶어요',
  WATCHING: '보는 중',
  FINISHED: '감상함',
}
// #endregion
