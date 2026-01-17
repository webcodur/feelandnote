// 콘텐츠 상태 상수 (Single Source of Truth)
import type { ContentStatus } from "@/types/database";

export interface StatusOption {
  value: ContentStatus;
  label: string;
}

// 전체 상태 옵션 (필터 UI용, "all" 포함)
export type StatusFilter = "all" | ContentStatus;

export interface StatusFilterOption {
  value: StatusFilter;
  label: string;
}

// 모든 상태 옵션 (콘텐츠 추가/수정용)
export const STATUS_OPTIONS: StatusOption[] = [
  { value: "WANT", label: "관심" },
  { value: "WATCHING", label: "진행중" },
  { value: "DROPPED", label: "중단" },
  { value: "FINISHED", label: "완료" },
  { value: "RECOMMENDED", label: "완료+추천" },
  { value: "NOT_RECOMMENDED", label: "완료+비추" },
];

// 필터용 상태 옵션 ("전체" 포함)
export const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: "all", label: "전체" },
  ...STATUS_OPTIONS,
];

// 셀럽 콘텐츠용 상태 옵션 (간소화)
export const CELEB_STATUS_OPTIONS: StatusOption[] = [
  { value: "FINISHED", label: "완료" },
  { value: "WATCHING", label: "경험중" },
  { value: "WANT", label: "예정" },
];

// 상태 라벨 조회
export const getStatusLabel = (status: ContentStatus): string => {
  return STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status;
};
