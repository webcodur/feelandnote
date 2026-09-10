import type { ReactNode } from "react";

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
  /** 필터 칩 줄 끝에 덧붙는 조작(전체 보기 등). 없으면 칩 줄만 그대로 선다 */
  trailing?: ReactNode;
}
