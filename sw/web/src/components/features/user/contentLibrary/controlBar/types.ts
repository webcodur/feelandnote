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
  /** 서버가 viewport를 아직 모를 때 CSS가 넓은 화면용 전환 버튼을 고른다. */
  responsiveDesktopViewMode?: ViewMode;
  isResponsiveViewUnresolved?: boolean;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  showMonthControls?: boolean;
  allowRatingSort?: boolean;
  compact?: boolean;
}
