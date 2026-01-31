/*
  파일명: /components/features/home/CelebFiltersMobile.tsx
  기능: 셀럽 필터 (모바일)
  책임: 직군, 국적, 콘텐츠, 정렬 필터 및 검색 UI 제공 (칩 + 모달 방식)
*/
"use client";

import { Search, X } from "lucide-react";
import { FilterChip, FilterModal, type FilterOption } from "@/components/shared/filters";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { SORT_OPTIONS, type FilterType } from "./useCelebFilters";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, CelebSortBy } from "@/actions/home";

interface CelebFiltersMobileProps {
  profession: string;
  nationality: string;
  contentType: string;
  sortBy: CelebSortBy;
  search: string;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  isLoading: boolean;
  activeFilter: FilterType | null;
  activeLabels: {
    profession?: { label: string };
    nationality?: { label: string };
    contentType?: { label: string };
    sort?: { label: string };
  };
  onFilterOpen: (filter: FilterType) => void;
  onFilterClose: () => void;
  onProfessionChange: (value: string) => void;
  onNationalityChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onSortChange: (value: CelebSortBy) => void;
  onSearchInput: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
}

export default function CelebFiltersMobile({
  profession,
  nationality,
  contentType,
  sortBy,
  search,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  isLoading,
  activeFilter,
  activeLabels,
  onFilterOpen,
  onFilterClose,
  onProfessionChange,
  onNationalityChange,
  onContentTypeChange,
  onSortChange,
  onSearchInput,
  onSearchSubmit,
  onSearchClear,
}: CelebFiltersMobileProps) {
  // 필터별 옵션 생성
  const professionOptions: FilterOption[] = CELEB_PROFESSION_FILTERS.map(({ value, label }) => ({
    value,
    label,
    count: professionCounts[value] ?? 0,
  }));

  const nationalityOptions: FilterOption[] = nationalityCounts.map(({ value, label, count }) => ({
    value,
    label,
    count,
  }));

  const contentTypeOptions: FilterOption[] = CONTENT_TYPE_FILTERS.map(({ value, label }) => ({
    value,
    label,
    count: contentTypeCounts[value] ?? 0,
  }));

  const sortOptions: FilterOption[] = SORT_OPTIONS.map(({ value, label }) => ({ value, label }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearchSubmit();
  };

  return (
    <>
      {/* 모바일 검색 및 필터 */}
      <div className="md:hidden mb-6 space-y-3">
        {/* 검색 입력 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="인물 검색..."
              className="w-full h-10 ps-9 pe-8 bg-bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
            {search && (
              <button
                type="button"
                onClick={onSearchClear}
                className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
              >
                <X size={14} className="text-text-tertiary" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onSearchSubmit}
            disabled={isLoading}
            className="h-10 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg shrink-0"
          >
            검색
          </button>
        </div>

        {/* 필터 칩들 - 그리드 */}
        <div className="grid grid-cols-2 gap-2">
          <FilterChip label="직군" value={activeLabels.profession?.label ?? "전체"} isActive={profession !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("profession")} className="w-full" />
          <FilterChip label="국적" value={activeLabels.nationality?.label ?? "전체"} isActive={nationality !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("nationality")} className="w-full" />
          <FilterChip label="콘텐츠" value={activeLabels.contentType?.label ?? "전체"} isActive={contentType !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("contentType")} className="w-full" />
          <FilterChip label="정렬" value={activeLabels.sort?.label ?? "영향력순"} isActive={sortBy !== "influence"} isLoading={isLoading} onClick={() => onFilterOpen("sort")} className="w-full" />
        </div>
      </div>

      {/* 모달들 */}
      <FilterModal title="직군" isOpen={activeFilter === "profession"} current={profession} options={professionOptions} onClose={onFilterClose} onChange={onProfessionChange} />
      <FilterModal title="국적" isOpen={activeFilter === "nationality"} current={nationality} options={nationalityOptions} onClose={onFilterClose} onChange={onNationalityChange} />
      <FilterModal title="콘텐츠" isOpen={activeFilter === "contentType"} current={contentType} options={contentTypeOptions} onClose={onFilterClose} onChange={onContentTypeChange} />
      <FilterModal title="정렬" isOpen={activeFilter === "sort"} current={sortBy} options={sortOptions} onClose={onFilterClose} onChange={(v) => onSortChange(v as CelebSortBy)} />
    </>
  );
}
