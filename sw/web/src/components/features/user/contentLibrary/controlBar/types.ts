import type { CategoryId } from "@/constants/categories";
import type { ContentTypeCounts } from "@/types/content";

import type { ReviewFilter, SortOption, ViewMode } from "../contentLibraryTypes";

export interface ArchiveControlBarProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts | null;
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
  /** 셀럽 서가는 감상에 리뷰가 항상 붙어 리뷰 필터를 숨긴다 */
  hideReviewFilter?: boolean;
  compact?: boolean;
}
