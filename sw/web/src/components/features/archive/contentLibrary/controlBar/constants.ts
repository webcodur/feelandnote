import { CATEGORIES } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import type { SortOption, StatusFilter } from "../useContentLibrary";

export const TAB_OPTIONS = CATEGORIES.map((cat) => ({
  value: cat.id,
  label: cat.label,
  icon: cat.icon,
  type: cat.dbType as ContentType,
}));

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "WANT", label: "관심" },
  { value: "WATCHING", label: "진행중" },
  { value: "DROPPED", label: "중단" },
  { value: "FINISHED", label: "완료" },
  { value: "RECOMMENDED", label: "추천" },
  { value: "NOT_RECOMMENDED", label: "비추" },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "최근 추가" },
  { value: "title", label: "이름순" },
];

export const CONTROL_BUTTON_VARIANTS = {
  default: "w-full h-8 rounded-lg border bg-surface/50 border-border/40 text-text-tertiary hover:bg-surface-hover hover:border-border hover:text-text-primary transition-colors",
  active: "w-full h-8 rounded-lg border bg-accent/10 border-accent/20 text-accent shadow-sm transition-colors",
};
