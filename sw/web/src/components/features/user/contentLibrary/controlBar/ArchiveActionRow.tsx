"use client";

import {
  ChevronsDownUp,
  ChevronsUpDown,
  List,
  Maximize2,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { SortOption, ViewMode } from "../contentLibraryTypes";

const VIEW_LABEL_KEY: Record<ViewMode, "listView" | "expandView"> = {
  list: "listView",
  expand: "expandView",
};
const VIEW_ICON = { list: List, expand: Maximize2 } as const;

interface ArchiveActionRowProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  responsiveDesktopViewMode?: ViewMode;
  isResponsiveViewUnresolved?: boolean;
  sortOption: SortOption;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  showMonthControls: boolean;
  compact: boolean;
}

export default function ArchiveActionRow({
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  viewMode,
  onViewModeChange,
  responsiveDesktopViewMode,
  isResponsiveViewUnresolved = false,
  sortOption,
  isAllCollapsed,
  onExpandAll,
  onCollapseAll,
  showMonthControls,
  compact,
}: ArchiveActionRowProps) {
  const t = useTranslations("archiveSearch");
  const nextViewMode: ViewMode = viewMode === "list" ? "expand" : "list";
  const NextViewIcon = VIEW_ICON[nextViewMode];
  const desktopNextViewMode: ViewMode = responsiveDesktopViewMode === "expand" ? "list" : "expand";
  const DesktopNextViewIcon = VIEW_ICON[desktopNextViewMode];
  const canSearch = searchQuery.trim().length >= 2;

  return (
    <div className={cn(
      "flex items-center gap-2",
      compact ? "justify-center px-2 py-2" : "px-6 py-3",
    )}>
      <div className={cn(
        "group/search relative min-w-0",
        compact ? "w-[220px] shrink" : "flex-1",
      )}>
        <div className="pointer-events-none absolute inset-0 rounded-md bg-accent/5 opacity-0 blur-sm transition-opacity group-focus-within/search:opacity-100" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSearch) onSearch();
          }}
          placeholder={t("placeholder")}
          className="relative z-10 min-h-[2.5rem] w-full min-w-0 rounded-md border border-white/10 bg-black/40 ps-3 pe-9 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent/40 focus:bg-black/60 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            aria-label={t("clearSearch")}
            className="absolute end-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-1 text-text-secondary hover:bg-white/10 hover:text-text-primary"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onSearch}
        disabled={!canSearch}
        aria-label={t("search")}
        className="flex min-h-[2.5rem] w-[2.5rem] items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-accent hover:border-accent/60 hover:bg-accent/20 disabled:opacity-50"
      >
        <Search size={16} />
      </button>

      <div className="mx-0.5 h-5 w-px bg-white/10" />
      {isResponsiveViewUnresolved && responsiveDesktopViewMode ? (
        <>
          <button
            type="button"
            onClick={() => onViewModeChange(nextViewMode)}
            data-testid="archive-view-toggle"
            data-next-view-mode={nextViewMode}
            aria-label={t(VIEW_LABEL_KEY[nextViewMode])}
            className="flex min-h-[2.5rem] w-[2.5rem] items-center justify-center rounded-lg border border-accent/25 bg-white/5 hover:border-accent/50 hover:bg-white/10 hover:text-text-primary md:hidden"
            title={t(VIEW_LABEL_KEY[nextViewMode])}
          >
            <NextViewIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange(desktopNextViewMode)}
            data-testid="archive-view-toggle"
            data-next-view-mode={desktopNextViewMode}
            aria-label={t(VIEW_LABEL_KEY[desktopNextViewMode])}
            className="hidden min-h-[2.5rem] w-[2.5rem] items-center justify-center rounded-lg border border-accent/25 bg-white/5 hover:border-accent/50 hover:bg-white/10 hover:text-text-primary md:flex"
            title={t(VIEW_LABEL_KEY[desktopNextViewMode])}
          >
            <DesktopNextViewIcon size={16} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onViewModeChange(nextViewMode)}
          data-testid="archive-view-toggle"
          data-next-view-mode={nextViewMode}
          aria-label={t(VIEW_LABEL_KEY[nextViewMode])}
          className="flex min-h-[2.5rem] w-[2.5rem] items-center justify-center rounded-lg border border-accent/25 bg-white/5 hover:border-accent/50 hover:bg-white/10 hover:text-text-primary"
          title={t(VIEW_LABEL_KEY[nextViewMode])}
        >
          <NextViewIcon size={16} />
        </button>
      )}

      {showMonthControls && (
        <button
          type="button"
          onClick={isAllCollapsed ? onExpandAll : onCollapseAll}
          disabled={sortOption !== "recent"}
          aria-label={isAllCollapsed ? t("expandAll") : t("collapseAll")}
          className="flex min-h-[2.5rem] w-[2.5rem] items-center justify-center rounded-lg border border-accent/25 bg-white/5 hover:border-accent/50 hover:bg-white/10 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-accent/25 disabled:hover:bg-white/5"
          title={isAllCollapsed ? t("expandAll") : t("collapseAll")}
        >
          {isAllCollapsed ? <ChevronsUpDown size={16} /> : <ChevronsDownUp size={16} />}
        </button>
      )}
    </div>
  );
}
