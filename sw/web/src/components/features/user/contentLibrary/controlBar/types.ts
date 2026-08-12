import type { CategoryId } from "@/constants/categories";
import type { ContentTypeCounts } from "@/types/content";

import type { ReviewFilter, SortOption, ViewMode } from "../contentLibraryTypes";

export interface ArchiveControlBarProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  reviewFilter: ReviewFilter;
  onReviewFilterChange: (filter: ReviewFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  showMonthControls?: boolean;
  compact?: boolean;
}
