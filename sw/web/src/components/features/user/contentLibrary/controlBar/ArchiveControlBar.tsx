"use client";

import ArchiveActionRow from "./ArchiveActionRow";
import ArchiveFilterRow from "./ArchiveFilterRow";
import type { ArchiveControlBarProps } from "./types";

export type { ArchiveControlBarProps } from "./types";

export default function ArchiveControlBar({
  showMonthControls = true,
  compact = false,
  ...props
}: ArchiveControlBarProps) {
  return (
    <div className="w-full">
      <ArchiveFilterRow
        activeTab={props.activeTab}
        onTabChange={props.onTabChange}
        typeCounts={props.typeCounts}
        sortOption={props.sortOption}
        onSortOptionChange={props.onSortOptionChange}
        reviewFilter={props.reviewFilter}
        onReviewFilterChange={props.onReviewFilterChange}
        allowRatingSort={props.allowRatingSort}
        compact={compact}
      />
      <ArchiveActionRow
        searchQuery={props.searchQuery}
        onSearchChange={props.onSearchChange}
        onSearch={props.onSearch}
        onClearSearch={props.onClearSearch}
        viewMode={props.viewMode}
        onViewModeChange={props.onViewModeChange}
        sortOption={props.sortOption}
        isAllCollapsed={props.isAllCollapsed}
        onExpandAll={props.onExpandAll}
        onCollapseAll={props.onCollapseAll}
        showMonthControls={showMonthControls}
        compact={compact}
      />
    </div>
  );
}
