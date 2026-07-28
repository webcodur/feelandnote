/*
  파일명: /components/features/user/contentLibrary/controlBar/ArchiveControlBar.tsx
  기능: 기록관 콘텐츠 라이브러리 컨트롤 바
  책임: 카테고리, 리뷰, 정렬 필터링 + 뷰 모드·접기/펼치기 UI를 제공한다.
*/
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X, ArrowUpDown, LayoutGrid, List, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { FilterChipDropdown, FilterChip, FilterModal, type FilterOption } from "@/components/shared/filters";
import type { SortOption, ReviewFilter, ViewMode } from "../contentLibraryTypes";
import type { ContentTypeCounts } from "@/types/content";
import type { CategoryId } from "@/constants/categories";
import { TAB_OPTIONS, SORT_OPTIONS, REVIEW_FILTER_OPTIONS } from "./constants";
import CategoryGuideModal from "./CategoryGuideModal";
import { cn } from "@/lib/utils";

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
  /** 축소 모드 — 패딩·높이 축소, 래퍼 없이 직접 노출될 때 사용 */
  compact?: boolean;
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
  compact = false,
}: ArchiveControlBarProps) {
  const t = useTranslations("archiveSearch");
  const tCategory = useTranslations("content.category");
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  // 전체 개수 계산
  const totalCount = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);

  // 옵션 목록
  const categoryOptions: FilterOption[] = TAB_OPTIONS.map((tab) => ({
    value: tab.value,
    label: tCategory(tab.value),
    count: tab.type ? typeCounts[tab.type] : totalCount,
  }));
  const sortOptions: FilterOption[] = SORT_OPTIONS.map(({ value, key }) => ({
    value,
    label: t(`sort.${key}`),
  }));
  const reviewOptions: FilterOption[] = REVIEW_FILTER_OPTIONS.map(({ value, key }) => ({
    value,
    label: t(`review.${key}`),
  }));

  // 현재 라벨
  const currentCategoryLabel = tCategory(
    TAB_OPTIONS.find((tab) => tab.value === activeTab)?.value ?? "all",
  );
  const currentSortLabel = t(
    `sort.${SORT_OPTIONS.find((option) => option.value === sortOption)?.key ?? "recent"}`,
  );
  const currentReviewLabel = t(
    `review.${REVIEW_FILTER_OPTIONS.find((option) => option.value === reviewFilter)?.key ?? "all"}`,
  );

  // 뷰 모드 토글
  const toggleViewMode = () => onViewModeChange(viewMode === "grid" ? "list" : "grid");

  // 접기/펼치기 토글
  const toggleCollapse = () => (isAllCollapsed ? onExpandAll() : onCollapseAll());

  return (
    <div className="w-full">
      {/* 1행: 필터 칩 */}
      <div className={cn(
        "flex items-center justify-center gap-2",
        compact ? "px-2 py-2" : "px-6 py-4 min-h-[4.5rem]"
      )}>
        {/* 데스크톱: 드롭다운 */}
        <div className="hidden md:flex items-center gap-2">
          <FilterChipDropdown
            label={t("filter.category")}
            value={currentCategoryLabel}
            isActive
            options={categoryOptions}
            currentValue={activeTab}
            onSelect={(v) => onTabChange(v as CategoryId)}
          />
          <FilterChipDropdown
            label={t("filter.review")}
            value={currentReviewLabel}
            isActive={reviewFilter !== "all"}
            options={reviewOptions}
            currentValue={reviewFilter}
            onSelect={(v) => onReviewFilterChange(v as ReviewFilter)}
          />
          <FilterChipDropdown
            label={t("filter.sort")}
            value={currentSortLabel}
            isActive={sortOption !== "recent"}
            options={sortOptions}
            currentValue={sortOption}
            onSelect={(v) => onSortOptionChange(v as SortOption)}
            icon={<ArrowUpDown size={14} />}
          />
        </div>

        {/* 모바일: 칩 → 모달 */}
        <div className="flex md:hidden w-full min-w-0 flex-wrap items-center gap-2">
          <FilterChip
            label={t("filter.category")}
            value={currentCategoryLabel}
            isActive
            onClick={() => setActiveFilter("category")}
            className="min-w-36 flex-1 !shrink"
          />
          <FilterChip
            label={t("filter.review")}
            value={currentReviewLabel}
            isActive={reviewFilter !== "all"}
            onClick={() => setActiveFilter("review")}
            className="min-w-36 flex-1 !shrink"
          />
          <FilterChip
            label={t("filter.sort")}
            value={currentSortLabel}
            isActive={sortOption !== "recent"}
            onClick={() => setActiveFilter("sort")}
            icon={<ArrowUpDown size={12} />}
            className="min-w-36 flex-1 !shrink"
          />
        </div>
      </div>

      {/* 2행: 검색 + 액션 버튼 */}
      <div className={cn(
        "flex items-center gap-2",
        compact ? "px-2 py-2 justify-center" : "px-6 py-3"
      )}>
        <div className={cn(
          "relative min-w-0 group/search",
          compact ? "w-[220px] shrink" : "flex-1"
        )}>
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
            placeholder={t("placeholder")}
            className="w-full min-w-0 min-h-[2.5rem] ps-3 pe-9 bg-black/40 border border-white/10 rounded-md text-sm text-text-primary placeholder: focus:outline-none focus:border-accent/40 focus:bg-black/60 transition-all font-sans relative z-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label={t("clearSearch")}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full hover:text-text-primary transition-colors z-20"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onSearch}
          disabled={searchQuery.trim().length < 2}
          aria-label={t("search")}
          className="min-h-[2.5rem] w-[2.5rem] flex items-center justify-center bg-accent/10 hover:bg-accent/20 border border-accent/30 hover:border-accent/60 disabled:opacity-50 text-accent rounded-md transition-all duration-300"
        >
          <Search size={16} />
        </button>

        {/* 구분선 */}
        <div className="w-px h-5 bg-white/10 mx-0.5" />

        {/* 뷰 모드 토글 (PC 전용) */}
        <button
          type="button"
          onClick={toggleViewMode}
          className="hidden md:flex min-h-[2.5rem] w-[2.5rem] items-center justify-center bg-white/5 border border-accent/25 hover:border-accent/50 hover:bg-white/10 hover:text-text-primary rounded-lg transition-colors"
          title={viewMode === "grid" ? t("listView") : t("gridView")}
        >
          {viewMode === "grid" ? <LayoutGrid size={16} /> : <List size={16} />}
        </button>

        {/* 월 접기/펼치기 (최근 추가 정렬에서만 활성) */}
        <button
          type="button"
          onClick={toggleCollapse}
          disabled={sortOption !== "recent"}
          className="min-h-[2.5rem] w-[2.5rem] flex items-center justify-center bg-white/5 border border-accent/25 hover:border-accent/50 hover:bg-white/10 hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-accent/25 disabled:hover: rounded-lg transition-colors"
          title={isAllCollapsed ? t("expandAll") : t("collapseAll")}
        >
          {isAllCollapsed ? <ChevronsUpDown size={16} /> : <ChevronsDownUp size={16} />}
        </button>
      </div>

      {/* 모바일 모달 */}
      <FilterModal
        title={t("filter.category")}
        isOpen={activeFilter === "category"}
        current={activeTab}
        options={categoryOptions}
        onClose={() => setActiveFilter(null)}
        onChange={(v) => onTabChange(v as CategoryId)}
      />
      <FilterModal
        title={t("filter.review")}
        isOpen={activeFilter === "review"}
        current={reviewFilter}
        options={reviewOptions}
        onClose={() => setActiveFilter(null)}
        onChange={(v) => onReviewFilterChange(v as ReviewFilter)}
      />
      <FilterModal
        title={t("filter.sort")}
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
