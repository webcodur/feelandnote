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
  WATCHING: { label: '진행중', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  DROPPED: { label: '중단', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  FINISHED: { label: '완료', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  RECOMMENDED: { label: '완료+추천', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  NOT_RECOMMENDED: { label: '완료+비추', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
}

// 모든 상태 옵션 (콘텐츠 추가/수정용)
export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'WANT', label: '관심', color: 'text-yellow-400' },
  { value: 'WATCHING', label: '진행중', color: 'text-blue-400' },
  { value: 'DROPPED', label: '중단', color: 'text-red-400' },
  { value: 'FINISHED', label: '완료', color: 'text-green-400' },
  { value: 'RECOMMENDED', label: '완료+추천', color: 'text-purple-400' },
  { value: 'NOT_RECOMMENDED', label: '완료+비추', color: 'text-gray-400' },
]

// 필터용 상태 옵션 ("전체" 포함)
export const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: '전체' },
  ...STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
]

// 셀럽 콘텐츠용 상태 옵션 (간소화)
export const CELEB_STATUS_OPTIONS: StatusOption[] = [
  { value: 'FINISHED', label: '완료' },
  { value: 'WATCHING', label: '경험중' },
  { value: 'WANT', label: '예정' },
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
