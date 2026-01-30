import { CATEGORIES, type CategoryId } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import type { SortOption } from "../useContentLibrary";
import { PantheonIcon } from "@/components/ui/icons/neo-pantheon";

export const TAB_OPTIONS: { value: CategoryId; label: string; icon: React.ComponentType<any>; type: ContentType | undefined }[] = [
  { value: "all", label: "전체", icon: PantheonIcon, type: undefined },
  ...CATEGORIES.map((cat) => ({
    value: cat.id as CategoryId,
    label: cat.label,
    icon: cat.icon,
    type: cat.dbType as ContentType,
  })),
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "최근 추가" },
  { value: "title", label: "이름순" },
];

export const CONTROL_BUTTON_VARIANTS = {
  default: "w-full h-7 sm:h-8 rounded-lg border bg-surface/50 border-border/40 text-text-tertiary hover:bg-surface-hover hover:border-border hover:text-text-primary transition-colors",
  active: "w-full h-7 sm:h-8 rounded-lg border bg-accent/10 border-accent/20 text-accent shadow-sm transition-colors",
};
