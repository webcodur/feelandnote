/*
  파일명: /app/(main)/[userId]/interests/InterestsControlBar.tsx
  기능: 관심 콘텐츠 페이지 컨트롤 바
  책임: 카테고리, 정렬 필터링 UI를 제공한다.
*/
"use client";

import { useState } from "react";
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
}

type FilterType = "category" | "sort";

export default function InterestsControlBar({
  activeTab,
  onTabChange,
  typeCounts,
  sortOption = "recent",
  onSortChange,
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
    <div>
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
