import { CATEGORIES } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import type { ProgressFilter, SortOption } from "../useContentLibrary";

export const TAB_OPTIONS = CATEGORIES.map((cat) => ({
  value: cat.id,
  label: cat.label,
  icon: cat.icon,
  type: cat.dbType as ContentType,
}));

export const PROGRESS_OPTIONS: { value: ProgressFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "not_started", label: "시작 전" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "최근 추가" },
  { value: "title", label: "이름순" },
  { value: "progress_desc", label: "진행도 높음" },
  { value: "progress_asc", label: "진행도 낮음" },
];

export const CONTROL_BUTTON_VARIANTS = {
  default: "w-full h-8 rounded-lg border bg-surface/50 border-border/40 text-text-tertiary hover:bg-surface-hover hover:border-border hover:text-text-primary transition-colors",
  active: "w-full h-8 rounded-lg border bg-accent/10 border-accent/20 text-accent shadow-sm transition-colors",
};
