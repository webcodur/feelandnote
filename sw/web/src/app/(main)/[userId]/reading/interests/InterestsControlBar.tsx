/*
  파일명: /app/(main)/[userId]/reading/interests/InterestsControlBar.tsx
  기능: 관심 콘텐츠 페이지 컨트롤 바
  책임: 카테고리, 정렬 필터링 + 검색 UI를 제공한다.
*/
"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/constants/categories";
import type { ContentTypeCounts } from "@/types/content";
import { FilterChipDropdown, FilterChip, FilterModal, type FilterOption } from "@/components/shared/filters";

export type InterestSortOption = "recent" | "title";

const SORT_OPTIONS: FilterOption[] = [
  { value: "recent", label: "최근 추가" },
  { value: "title", label: "이름순" },
];

interface InterestsControlBarProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts;
  total: number;
  sortOption?: InterestSortOption;
  onSortChange?: (sort: InterestSortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
}

type FilterType = "category" | "sort";

export default function InterestsControlBar({
  activeTab,
  onTabChange,
  typeCounts,
  sortOption = "recent",
  onSortChange,
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
}: InterestsControlBarProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  // 카테고리 옵션 (count 포함)
  const categoryOptions: FilterOption[] = CATEGORIES.map((cat) => ({
    value: cat.id,
    label: cat.label,
    count: typeCounts[cat.dbType as keyof ContentTypeCounts] ?? 0,
  }));

  const currentCategoryLabel = CATEGORIES.find((c) => c.id === activeTab)?.label ?? "도서";
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "최근 추가";

  return (
    <div className="w-full">
      {/* 1행: 필터 칩 */}
      <div className="flex items-center justify-center gap-2 px-1">
        {/* 데스크톱: 드롭다운 */}
        <div className="hidden md:flex items-center gap-2">
          <FilterChipDropdown
            label="카테고리"
            value={currentCategoryLabel}
            isActive
            options={categoryOptions}
            currentValue={activeTab}
            onSelect={(v) => onTabChange(v as CategoryId)}
          />
          {onSortChange && (
            <FilterChipDropdown
              label="정렬"
              value={currentSortLabel}
              isActive={sortOption !== "recent"}
              options={SORT_OPTIONS}
              currentValue={sortOption}
              onSelect={(v) => onSortChange(v as InterestSortOption)}
            />
          )}
        </div>

        {/* 모바일: 칩 → 모달 */}
        <div className="flex md:hidden items-center gap-2">
          <FilterChip
            label="카테고리"
            value={currentCategoryLabel}
            isActive
            onClick={() => setActiveFilter("category")}
          />
          {onSortChange && (
            <FilterChip
              label="정렬"
              value={currentSortLabel}
              isActive={sortOption !== "recent"}
              onClick={() => setActiveFilter("sort")}
            />
          )}
        </div>
      </div>

      {/* 2행: 검색 */}
      <div className="flex items-center gap-2 mt-3">
        <div className="relative flex-1 min-w-0 group/search">
          <div className="absolute inset-0 bg-accent/5 blur-sm opacity-0 group-focus-within/search:opacity-100 transition-opacity rounded-md pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                onSearch();
              }
            }}
            placeholder="제목 또는 저자 검색 (2글자 이상)"
            className="w-full min-w-0 h-9 ps-3 pe-9 bg-black/40 border border-white/10 rounded-md text-sm text-text-primary placeholder:text-text-tertiary/70 focus:outline-none focus:border-accent/40 focus:bg-black/60 transition-all font-sans relative z-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-text-tertiary hover:text-text-primary transition-colors z-20"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onSearch}
          disabled={searchQuery.trim().length < 2}
          className="h-9 w-9 flex items-center justify-center bg-accent/10 hover:bg-accent/20 border border-accent/30 hover:border-accent/60 disabled:opacity-50 text-accent rounded-md transition-all duration-300"
        >
          <Search size={16} />
        </button>
      </div>

      {/* 모바일 모달 */}
      <FilterModal
        title="카테고리"
        isOpen={activeFilter === "category"}
        current={activeTab}
        options={categoryOptions}
        onClose={() => setActiveFilter(null)}
        onChange={(v) => onTabChange(v as CategoryId)}
      />
      {onSortChange && (
        <FilterModal
          title="정렬"
          isOpen={activeFilter === "sort"}
          current={sortOption}
          options={SORT_OPTIONS}
          onClose={() => setActiveFilter(null)}
          onChange={(v) => onSortChange(v as InterestSortOption)}
        />
      )}
    </div>
  );
}
