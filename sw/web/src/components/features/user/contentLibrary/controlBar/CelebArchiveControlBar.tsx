"use client";

import { useTranslations } from "next-intl";

import { ContentTypeSummary } from "@/components/ui/ContentTypeSummary";
import { CATEGORY_ID_TO_TYPE, getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";

import ArchiveSearchControls from "./ArchiveSearchControls";
import ArchiveSortControl from "./ArchiveSortControl";
import ArchiveViewControls from "./ArchiveViewControls";
import type { ArchiveControlBarProps } from "./types";

export default function CelebArchiveControlBar({
  compact = false,
  categoryItems = [],
  ...props
}: ArchiveControlBarProps) {
  const t = useTranslations("archiveSearch");
  const activeType = CATEGORY_ID_TO_TYPE[props.activeTab] ?? null;
  const rowPadding = compact ? "px-2 py-1.5" : "px-6 py-2.5";

  return (
    <div className="mx-auto w-fit max-w-full overflow-hidden rounded-xl border border-accent-dim/30 bg-bg-secondary shadow-inner">
      <div
        aria-label={t("filter.category")}
        className={cn(
          "flex justify-center",
          compact ? "px-2 py-2.5" : "px-6 py-3.5",
        )}
      >
        <ContentTypeSummary
          items={categoryItems}
          counts={props.typeCounts}
          value={activeType}
          onChange={(type) => {
            const category = getCategoryByDbType(type);
            if (category) props.onTabChange(category.id);
          }}
          size="md"
          ariaLabel={t("filter.category")}
        />
      </div>

      <div className={cn(
        "flex items-center justify-center gap-2",
        rowPadding,
      )}>
        <ArchiveSortControl
          sortOption={props.sortOption}
          onSortOptionChange={props.onSortOptionChange}
          allowRatingSort={props.allowRatingSort}
        />
        <ArchiveViewControls
          viewMode={props.viewMode}
          onViewModeChange={props.onViewModeChange}
          responsiveDesktopViewMode={props.responsiveDesktopViewMode}
          isResponsiveViewUnresolved={props.isResponsiveViewUnresolved}
        />
        {props.trailing}
      </div>

      <div className={cn("flex justify-center", rowPadding)}>
        <ArchiveSearchControls
          searchQuery={props.searchQuery}
          onSearchChange={props.onSearchChange}
          onSearch={props.onSearch}
          onClearSearch={props.onClearSearch}
          hasAppliedSearch={props.hasAppliedSearch}
          compact={compact}
          fullWidth
          className="w-[268px] max-w-full flex-none"
        />
      </div>
    </div>
  );
}
