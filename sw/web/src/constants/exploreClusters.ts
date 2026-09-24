import type { CelebSortBy } from "@/actions/home";
import type { CelebContentPresence } from "@/constants/celebContentPresence";

export interface ExploreCluster {
  profession: string;
  gender?: "male" | "female";
  nationality?: string;
  contentType?: string;
  contentPresence: CelebContentPresence;
  sortBy: CelebSortBy;
}

// Each combination has enough people with recorded works to fill multiple pages.
// The selected values become removable chips on the first Explore visit.
export const EXPLORE_START_CLUSTERS: readonly ExploreCluster[] = [
  { profession: "actor", gender: "female", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "musician", gender: "male", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "author", gender: "male", contentType: "BOOK", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "entrepreneur", contentType: "BOOK", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "athlete", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "director", contentType: "VIDEO", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "musician", gender: "female", nationality: "KR", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "actor", gender: "male", nationality: "US", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "scientist", gender: "male", contentType: "BOOK", contentPresence: "with", sortBy: "daily_recommend" },
  { profession: "author", gender: "female", contentType: "BOOK", contentPresence: "with", sortBy: "daily_recommend" },
];
