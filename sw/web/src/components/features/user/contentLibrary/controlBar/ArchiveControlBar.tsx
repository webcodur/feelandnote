"use client";

import ArchiveActionRow from "./ArchiveActionRow";
import ArchiveFilterRow from "./ArchiveFilterRow";
import CelebArchiveControlBar from "./CelebArchiveControlBar";
import type { ArchiveControlBarProps } from "./types";

export type { ArchiveControlBarProps } from "./types";

export default function ArchiveControlBar(props: ArchiveControlBarProps) {
  if (props.ownerKind === "celeb") {
    return <CelebArchiveControlBar {...props} />;
  }

  const {
    showMonthControls = true,
    compact = false,
  } = props;

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
        hideReviewFilter={props.hideReviewFilter}
        compact={compact}
        trailing={props.trailing}
      />
      <ArchiveActionRow
        searchQuery={props.searchQuery}
        onSearchChange={props.onSearchChange}
        onSearch={props.onSearch}
        onClearSearch={props.onClearSearch}
        hasAppliedSearch={props.hasAppliedSearch}
        viewMode={props.viewMode}
        onViewModeChange={props.onViewModeChange}
        isExpandIndexOpen={props.isExpandIndexOpen}
        onExpandIndexToggle={props.onExpandIndexToggle}
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
