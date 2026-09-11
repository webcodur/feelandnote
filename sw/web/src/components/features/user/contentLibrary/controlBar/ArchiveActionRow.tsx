"use client";

import {
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { SortOption, ViewMode } from "../contentLibraryTypes";

import ArchiveIndexToggle from "./ArchiveIndexToggle";
import ArchiveSearchControls from "./ArchiveSearchControls";
import ArchiveViewControls from "./ArchiveViewControls";

interface ArchiveActionRowProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  /** 지금 목록에 적용된 검색어가 있는지. 검색대를 비운 뒤 검색 버튼을 초기화 단추로 살릴지 정한다 */
  hasAppliedSearch: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isExpandIndexOpen?: boolean;
  onExpandIndexToggle?: () => void;
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
  hasAppliedSearch,
  viewMode,
  onViewModeChange,
  isExpandIndexOpen = false,
  onExpandIndexToggle,
  sortOption,
  isAllCollapsed,
  onExpandAll,
  onCollapseAll,
  showMonthControls,
  compact,
}: ArchiveActionRowProps) {
  const t = useTranslations("archiveSearch");
  const showIndexToggle = Boolean(onExpandIndexToggle) && viewMode === "expand";

  return (
    <div className={cn(
      "flex items-center gap-2",
      compact ? "justify-center px-2 py-2" : "px-6 py-3",
    )}>
      <ArchiveSearchControls
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
        hasAppliedSearch={hasAppliedSearch}
        compact={compact}
      />

      <div className="mx-0.5 h-5 w-px bg-white/10" />
      <ArchiveViewControls
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      {showIndexToggle && (
        <ArchiveIndexToggle isOpen={isExpandIndexOpen} onToggle={onExpandIndexToggle!} />
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
