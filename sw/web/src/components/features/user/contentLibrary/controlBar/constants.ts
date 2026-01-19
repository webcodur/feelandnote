import { CATEGORIES } from "@/constants/categories";
import { RECORD_STATUS_FILTER_OPTIONS } from "@/constants/statuses";
import type { ContentType } from "@/types/database";
import type { SortOption } from "../useContentLibrary";

export const TAB_OPTIONS = CATEGORIES.map((cat) => ({
  value: cat.id,
  label: cat.label,
  icon: cat.icon,
  type: cat.dbType as ContentType,
}));

// RECORD_STATUS_FILTER_OPTIONS 사용 (WANT 제외 - 관심 탭으로 분리됨)
export const STATUS_OPTIONS = RECORD_STATUS_FILTER_OPTIONS;

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "최근 추가" },
  { value: "title", label: "이름순" },
];

export const CONTROL_BUTTON_VARIANTS = {
  default: "w-full h-7 sm:h-8 rounded-lg border bg-surface/50 border-border/40 text-text-tertiary hover:bg-surface-hover hover:border-border hover:text-text-primary transition-colors",
  active: "w-full h-7 sm:h-8 rounded-lg border bg-accent/10 border-accent/20 text-accent shadow-sm transition-colors",
};
