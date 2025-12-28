"use client";

import { Filter, ArrowUpDown, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import { FilterSelect, type FilterOption } from "@/components/ui";
import type { ProgressFilter, SortOption } from "./hooks/useContentLibrary";

const PROGRESS_OPTIONS: FilterOption<ProgressFilter>[] = [
  { value: "all", label: "전체" },
  { value: "not_started", label: "시작 전" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
];

const SORT_OPTIONS: FilterOption<SortOption>[] = [
  { value: "recent", label: "최근 추가순" },
  { value: "title", label: "제목순" },
  { value: "progress_desc", label: "진행도 높은순" },
  { value: "progress_asc", label: "진행도 낮은순" },
];

interface ContentLibraryFiltersProps {
  progressFilter: ProgressFilter;
  onProgressFilterChange: (filter: ProgressFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  showExpandToggle?: boolean;
  isAllCollapsed?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  compact?: boolean;
}

export default function ContentLibraryFilters({
  progressFilter,
  onProgressFilterChange,
  sortOption,
  onSortOptionChange,
  showExpandToggle = false,
  isAllCollapsed = false,
  onExpandAll,
  onCollapseAll,
  compact = false,
}: ContentLibraryFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-2">
        <FilterSelect
          options={PROGRESS_OPTIONS}
          value={progressFilter}
          onChange={onProgressFilterChange}
          icon={Filter}
          compact={compact}
          defaultValue="all"
        />
        <FilterSelect
          options={SORT_OPTIONS}
          value={sortOption}
          onChange={onSortOptionChange}
          icon={ArrowUpDown}
          compact={compact}
          defaultValue="recent"
        />
      </div>
      {showExpandToggle && (
        <button
          onClick={isAllCollapsed ? onExpandAll : onCollapseAll}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded transition-colors"
          title={isAllCollapsed ? "전체 열기" : "전체 닫기"}
        >
          {isAllCollapsed ? (
            <>
              <ChevronsUpDown size={14} />
              <span className="hidden sm:inline">전체 열기</span>
            </>
          ) : (
            <>
              <ChevronsDownUp size={14} />
              <span className="hidden sm:inline">전체 닫기</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
