/*
  파일명: /components/features/user/contentLibrary/controlBar/ArchiveControlBar.tsx
  기능: 기록관 콘텐츠 라이브러리 컨트롤 바
  책임: 카테고리, 리뷰, 정렬 필터링 + 뷰 모드·접기/펼치기 UI를 제공한다.
*/
"use client";

import { useState } from "react";
import { Search, X, ArrowUpDown, LayoutGrid, List, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { FilterChipDropdown, FilterChip, FilterModal, type FilterOption } from "@/components/shared/filters";
import type { SortOption, ReviewFilter, ViewMode } from "../contentLibraryTypes";
import type { ContentTypeCounts } from "@/types/content";
import type { CategoryId } from "@/constants/categories";
import { TAB_OPTIONS, SORT_OPTIONS, REVIEW_FILTER_OPTIONS } from "./constants";
import CategoryGuideModal from "./CategoryGuideModal";

export interface ArchiveControlBarProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  reviewFilter: ReviewFilter;
  onReviewFilterChange: (filter: ReviewFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
}

type FilterType = "category" | "sort" | "review";

export default function ArchiveControlBar({
  activeTab,
  onTabChange,
  typeCounts,
  sortOption,
  onSortOptionChange,
  reviewFilter,
  onReviewFilterChange,
  viewMode,
  onViewModeChange,
  isAllCollapsed,
  onExpandAll,
  onCollapseAll,
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
}: ArchiveControlBarProps) {
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  // 전체 개수 계산
  const totalCount = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);

  // 옵션 목록
  const categoryOptions: FilterOption[] = TAB_OPTIONS.map((tab) => ({
    value: tab.value,
    label: tab.label,
    count: tab.type ? typeCounts[tab.type] : totalCount,
  }));
  const sortOptions: FilterOption[] = SORT_OPTIONS.map(({ value, label }) => ({ value, label }));
  const reviewOptions: FilterOption[] = REVIEW_FILTER_OPTIONS.map(({ value, label }) => ({ value, label }));

  // 현재 라벨
  const currentCategoryLabel = TAB_OPTIONS.find((t) => t.value === activeTab)?.label ?? "전체";
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "최근 추가";
  const currentReviewLabel = REVIEW_FILTER_OPTIONS.find((o) => o.value === reviewFilter)?.label ?? "전체";

  // 뷰 모드 토글
  const toggleViewMode = () => onViewModeChange(viewMode === "grid" ? "list" : "grid");

  // 접기/펼치기 토글
  const toggleCollapse = () => (isAllCollapsed ? onExpandAll() : onCollapseAll());

  return (
    <div className="w-full">
      {/* 1행: 필터 칩 */}
      <div className="flex items-center justify-center gap-2 px-6 py-4 min-h-[4.5rem]">
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
          <FilterChipDropdown
            label="리뷰"
            value={currentReviewLabel}
            isActive={reviewFilter !== "all"}
            options={reviewOptions}
            currentValue={reviewFilter}
            onSelect={(v) => onReviewFilterChange(v as ReviewFilter)}
          />
          <FilterChipDropdown
            label="정렬"
            value={currentSortLabel}
            isActive={sortOption !== "recent"}
            options={sortOptions}
            currentValue={sortOption}
            onSelect={(v) => onSortOptionChange(v as SortOption)}
            icon={<ArrowUpDown size={14} />}
          />
        </div>

        {/* 모바일: 칩 → 모달 */}
        <div className="flex md:hidden items-center gap-2">
          <FilterChip
            label="카테고리"
            value={currentCategoryLabel}
            isActive
            onClick={() => setActiveFilter("category")}
          />
          <FilterChip
            label="리뷰"
            value={currentReviewLabel}
            isActive={reviewFilter !== "all"}
            onClick={() => setActiveFilter("review")}
          />
          <FilterChip
            label="정렬"
            value={currentSortLabel}
            isActive={sortOption !== "recent"}
            onClick={() => setActiveFilter("sort")}
            icon={<ArrowUpDown size={12} />}
          />
        </div>
      </div>

      {/* 2행: 검색 + 액션 버튼 */}
      <div className="flex items-center gap-2 px-6 py-3">
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

        {/* 구분선 */}
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* 뷰 모드 토글 (PC 전용, 모바일은 2열 포스터 고정) */}
        <button
          type="button"
          onClick={toggleViewMode}
          className="hidden md:flex h-9 w-9 items-center justify-center bg-white/5 border border-accent/25 hover:border-accent/50 hover:bg-white/10 text-text-tertiary hover:text-text-primary rounded-lg transition-colors"
          title={viewMode === "grid" ? "리스트 보기" : "그리드 보기"}
        >
          {viewMode === "grid" ? <LayoutGrid size={16} /> : <List size={16} />}
        </button>

        {/* 월 접기/펼치기 (최근 추가 정렬에서만 활성) */}
        <button
          type="button"
          onClick={toggleCollapse}
          disabled={sortOption !== "recent"}
          className="h-9 w-9 flex items-center justify-center bg-white/5 border border-accent/25 hover:border-accent/50 hover:bg-white/10 text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-accent/25 disabled:hover:text-text-tertiary rounded-lg transition-colors"
          title={isAllCollapsed ? "전체 펼치기" : "전체 접기"}
        >
          {isAllCollapsed ? <ChevronsUpDown size={16} /> : <ChevronsDownUp size={16} />}
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
      <FilterModal
        title="리뷰"
        isOpen={activeFilter === "review"}
        current={reviewFilter}
        options={reviewOptions}
        onClose={() => setActiveFilter(null)}
        onChange={(v) => onReviewFilterChange(v as ReviewFilter)}
      />
      <FilterModal
        title="정렬"
        isOpen={activeFilter === "sort"}
        current={sortOption}
        options={sortOptions}
        onClose={() => setActiveFilter(null)}
        onChange={(v) => onSortOptionChange(v as SortOption)}
      />

      <CategoryGuideModal isOpen={isCategoryGuideOpen} onClose={() => setIsCategoryGuideOpen(false)} />
    </div>
  );
}
