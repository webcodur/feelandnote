import { CATEGORIES, type CategoryId } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import type { SortOption, ReviewFilter } from "../contentLibraryTypes";
import { PantheonIcon, type IconProps } from "@/components/ui/icons/neo-pantheon";

export const TAB_OPTIONS: { value: CategoryId; label: string; icon: React.ComponentType<IconProps>; type: ContentType | undefined }[] = [
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
  { value: "rating_desc", label: "별점 높은순" },
  { value: "rating_asc", label: "별점 낮은순" },
  { value: "creator", label: "저자순" },
];

export const REVIEW_FILTER_OPTIONS: { value: ReviewFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "has_review", label: "리뷰 있음" },
  { value: "no_review", label: "리뷰 없음" },
];
