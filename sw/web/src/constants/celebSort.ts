import type { CelebSortBy } from "@/actions/home";

/** Explore's default and menu order are shared by SSR and client controls. */
export const DEFAULT_EXPLORE_SORT: CelebSortBy = "country_trending";
export const CELEB_SORT_OPTIONS: CelebSortBy[] = [
  "country_trending", "content_count", "composite", "follower", "influence", "name_asc",
  "birth_date_desc", "birth_date_asc", "daily_recommend",
];

export function parseExploreSort(value: unknown): CelebSortBy {
  return typeof value === "string" && CELEB_SORT_OPTIONS.includes(value as CelebSortBy)
    ? value as CelebSortBy
    : DEFAULT_EXPLORE_SORT;
}
