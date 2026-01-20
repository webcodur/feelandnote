// 콘텐츠 상태 상수 (Single Source of Truth)
import type { ContentStatus } from '../types'

export interface StatusConfig {
  label: string
  color: string
  bgColor: string
}

export interface StatusOption {
  value: ContentStatus
  label: string
  color?: string
}

export type StatusFilter = 'all' | ContentStatus

export interface StatusFilterOption {
  value: StatusFilter
  label: string
}

// 상태 설정 (Record 형태, 색상 정보 포함)
export const STATUS_CONFIG: Record<ContentStatus, StatusConfig> = {
  WANT: { label: '관심', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  FINISHED: { label: '감상함', color: 'text-green-400', bgColor: 'bg-green-500/10' },
}

// 모든 상태 옵션 (콘텐츠 추가/수정용)
export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'WANT', label: '관심', color: 'text-yellow-400' },
  { value: 'FINISHED', label: '감상함', color: 'text-green-400' },
]

// 필터용 상태 옵션 ("전체" 포함)
export const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: '전체' },
  ...STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
]

// 셀럽 콘텐츠용 상태 옵션
export const CELEB_STATUS_OPTIONS: StatusOption[] = [
  { value: 'FINISHED', label: '감상함' },
  { value: 'WANT', label: '관심' },
]

// 유틸 함수
export const getStatusLabel = (status: ContentStatus): string => {
  return STATUS_CONFIG[status]?.label ?? status
}

export const getStatusColor = (status: ContentStatus): string => {
  return STATUS_CONFIG[status]?.color ?? 'text-gray-400'
}

export const getStatusBgColor = (status: ContentStatus): string => {
  return STATUS_CONFIG[status]?.bgColor ?? 'bg-gray-500/10'
}
