import type { ReactNode } from "react";

import type { CategoryId } from "@/constants/categories";
import type { ContentTypeCounts } from "@/types/content";

import type { ContentOwnerKind, ReviewFilter, SortOption, ViewMode } from "../contentLibraryTypes";

export interface ArchiveControlBarProps {
  ownerKind?: ContentOwnerKind;
  categoryItems?: readonly { type: string }[];
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts | null;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  reviewFilter: ReviewFilter;
  onReviewFilterChange: (filter: ReviewFilter) => void;
  /** 목록·펼침 전환. 인물 서가는 펼침으로 고정이라 전환 단추를 두지 않는다 */
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Expanded view index visibility. */
  isExpandIndexOpen?: boolean;
  /** Toggles the expanded view index. */
  onExpandIndexToggle?: () => void;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  /** 지금 목록에 적용된 검색어가 있는지 */
  hasAppliedSearch: boolean;
  showMonthControls?: boolean;
  allowRatingSort?: boolean;
  /** 셀럽 서가는 감상에 리뷰가 항상 붙어 리뷰 필터를 숨긴다 */
  hideReviewFilter?: boolean;
  compact?: boolean;
  /** 조작대에 덧붙는 조작. 인물 서가에서는 카테고리 옆에 표시한다. */
  trailing?: ReactNode;
}
