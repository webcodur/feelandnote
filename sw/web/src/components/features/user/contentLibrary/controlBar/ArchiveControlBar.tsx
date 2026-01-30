/*
  파일명: /components/features/user/contentLibrary/controlBar/ArchiveControlBar.tsx
  기능: 기록관 콘텐츠 라이브러리 컨트롤 바
  책임: 카테고리, 상태, 정렬 필터링 UI를 제공한다.
*/
"use client";

import { useState } from "react";
import { FilterChipDropdown, FilterChip, FilterModal, type FilterOption } from "@/components/shared/filters";
import type { SortOption } from "../useContentLibrary";
import type { ContentTypeCounts } from "@/types/content";
import type { CategoryId } from "@/constants/categories";
import { TAB_OPTIONS, SORT_OPTIONS } from "./constants";
import CategoryGuideModal from "./CategoryGuideModal";

export interface ArchiveControlBarProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

type FilterType = "category" | "sort";

export default function ArchiveControlBar({
  activeTab,
  onTabChange,
  typeCounts,
  sortOption,
  onSortOptionChange,
}: ArchiveControlBarProps) {
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  // 전체 개수 계산
  const totalCount = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);

  // 카테고리 옵션 (count 포함)
  const categoryOptions: FilterOption[] = TAB_OPTIONS.map((tab) => ({
    value: tab.value,
    label: tab.label,
    count: tab.type ? typeCounts[tab.type] : totalCount,
  }));

  const sortOptions: FilterOption[] = SORT_OPTIONS.map(({ value, label }) => ({ value, label }));

  // 현재 라벨 조회
  const currentCategoryLabel = TAB_OPTIONS.find((t) => t.value === activeTab)?.label ?? "전체";
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "최근 추가";

  return (
    <div>
      <div className="flex flex-col gap-2">
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
              label="정렬"
              value={currentSortLabel}
              isActive={sortOption !== "recent"}
              onClick={() => setActiveFilter("sort")}
            />
          </div>
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
