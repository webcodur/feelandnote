/*
  파일명: /components/features/user/contentLibrary/controlBar/ArchiveControlBar.tsx
  기능: 기록관 콘텐츠 라이브러리 컨트롤 바
  책임: 카테고리, 상태, 정렬 필터링 UI를 제공한다.
*/
"use client";

import { useState } from "react";
import { Tag } from "lucide-react";
import Button from "@/components/ui/Button";
import { FilterChipDropdown, FilterChip, FilterModal, type FilterOption } from "@/components/shared/filters";
import type { CategoryWithCount } from "@/types/database";
import type { SortOption, StatusFilter } from "../useContentLibrary";
import type { ContentTypeCounts } from "@/types/content";
import type { CategoryId } from "@/constants/categories";
import { TAB_OPTIONS, STATUS_OPTIONS, SORT_OPTIONS } from "./constants";
import CategoryChip from "./CategoryChip";
import CategoryGuideModal from "./CategoryGuideModal";

export interface ArchiveControlBarProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts;
  categories: CategoryWithCount[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onManageCategories: () => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

type FilterType = "category" | "status" | "sort";

export default function ArchiveControlBar({
  activeTab,
  onTabChange,
  typeCounts,
  categories,
  selectedCategoryId,
  onCategoryChange,
  onManageCategories,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
}: ArchiveControlBarProps) {
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  // 카테고리 옵션 (count 포함)
  const categoryOptions: FilterOption[] = TAB_OPTIONS.map((tab) => ({
    value: tab.value,
    label: tab.label,
    count: typeCounts[tab.type] ?? 0,
  }));

  const statusOptions: FilterOption[] = STATUS_OPTIONS.map(({ value, label }) => ({ value, label }));
  const sortOptions: FilterOption[] = SORT_OPTIONS.map(({ value, label }) => ({ value, label }));

  // 현재 라벨 조회
  const currentCategoryLabel = TAB_OPTIONS.find((t) => t.value === activeTab)?.label ?? "도서";
  const currentStatusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "전체";
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "최근 추가";

  return (
    <div className="sticky top-0 z-30 bg-background pt-2 pb-1 sm:pt-4 sm:pb-2 space-y-3">
      {/* 필터 칩 영역 */}
      <div className="flex items-center gap-2 px-1">
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
            label="상태"
            value={currentStatusLabel}
            isActive={statusFilter !== "all"}
            options={statusOptions}
            currentValue={statusFilter}
            onSelect={(v) => onStatusFilterChange(v as StatusFilter)}
          />
          <FilterChipDropdown
            label="정렬"
            value={currentSortLabel}
            isActive={sortOption !== "recent"}
            options={sortOptions}
            currentValue={sortOption}
            onSelect={(v) => onSortOptionChange(v as SortOption)}
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
            label="상태"
            value={currentStatusLabel}
            isActive={statusFilter !== "all"}
            onClick={() => setActiveFilter("status")}
          />
          <FilterChip
            label="정렬"
            value={currentSortLabel}
            isActive={sortOption !== "recent"}
            onClick={() => setActiveFilter("sort")}
          />
        </div>

        {/* 구분선 */}
        <div className="w-px h-5 bg-accent/20 mx-1 shrink-0" />

        {/* 소분류 - 가로 스크롤 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
          <Button
            type="button"
            onClick={onManageCategories}
            className="px-2 py-1.5 text-xs font-semibold text-text-tertiary hover:text-accent flex-shrink-0 rounded-lg flex items-center gap-1"
            title="소분류 관리"
          >
            <Tag size={12} />
            <span className="hidden sm:inline">소분류</span>
          </Button>

          {categories.length > 0 && (
            <>
              <CategoryChip label="전체" isActive={selectedCategoryId === null} onClick={() => onCategoryChange(null)} />
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={cat.name}
                  count={cat.content_count}
                  isActive={selectedCategoryId === cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                />
              ))}
            </>
          )}
        </div>
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
        title="상태"
        isOpen={activeFilter === "status"}
        current={statusFilter}
        options={statusOptions}
        onClose={() => setActiveFilter(null)}
        onChange={(v) => onStatusFilterChange(v as StatusFilter)}
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
