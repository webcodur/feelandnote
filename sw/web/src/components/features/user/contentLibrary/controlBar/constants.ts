import { CATEGORIES, type CategoryId } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import type { SortOption, ReviewFilter } from "../contentLibraryTypes";
import { PantheonIcon, type IconProps } from "@/components/ui/icons/neo-pantheon";

export const TAB_OPTIONS: { value: CategoryId; icon: React.ComponentType<IconProps>; type: ContentType | undefined }[] = [
  { value: "all", icon: PantheonIcon, type: undefined },
  ...CATEGORIES.map((cat) => ({
    value: cat.id as CategoryId,
    icon: cat.icon,
    type: cat.dbType as ContentType,
  })),
];

export const SORT_OPTIONS: { value: SortOption; key: string }[] = [
  { value: "recent", key: "recent" },
  { value: "title", key: "title" },
  { value: "rating_desc", key: "ratingHigh" },
  { value: "rating_asc", key: "ratingLow" },
  { value: "creator", key: "creator" },
];

export const REVIEW_FILTER_OPTIONS: { value: ReviewFilter; key: string }[] = [
  { value: "all", key: "all" },
  { value: "has_review", key: "hasReview" },
  { value: "no_review", key: "noReview" },
];
