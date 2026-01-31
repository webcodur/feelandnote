/*
  파일명: /components/features/home/CelebFiltersDesktop.tsx
  기능: 셀럽 필터 (데스크톱)
  책임: 직군, 국적, 콘텐츠, 정렬 필터 및 검색 UI 제공
*/
"use client";

import { Search, X } from "lucide-react";
import { FilterChipDropdown, type FilterOption } from "@/components/shared/filters";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { SORT_OPTIONS } from "./useCelebFilters";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, CelebSortBy } from "@/actions/home";

interface CelebFiltersDesktopProps {
  profession: string;
  nationality: string;
  contentType: string;
  sortBy: CelebSortBy;
  search: string;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  isLoading: boolean;
  activeLabels: {
    profession?: { label: string };
    nationality?: { label: string };
    contentType?: { label: string };
    sort?: { label: string };
  };
  onProfessionChange: (value: string) => void;
  onNationalityChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onSortChange: (value: CelebSortBy) => void;
  onSearchInput: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  hideSearch?: boolean;
}

export default function CelebFiltersDesktop({
  profession,
  nationality,
  contentType,
  sortBy,
  search,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  isLoading,
  activeLabels,
  onProfessionChange,
  onNationalityChange,
  onContentTypeChange,
  onSortChange,
  onSearchInput,
  onSearchSubmit,
  onSearchClear,
  hideSearch = false,
}: CelebFiltersDesktopProps) {
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
    <div className="hidden md:flex items-center justify-center gap-3 mb-4">
      {/* 검색 입력 - hideSearch가 false일 때만 표시 */}
      {!hideSearch && (
        <div className="relative flex-1 max-w-xs flex gap-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="인물 검색..."
              className="w-full h-9 ps-9 pe-8 bg-bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
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
            className="h-9 px-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            검색
          </button>
        </div>
      )}

      <FilterChipDropdown
        label="직군"
        value={activeLabels.profession?.label ?? "전체"}
        isActive={profession !== "all"}
        isLoading={isLoading}
        options={professionOptions}
        currentValue={profession}
        onSelect={onProfessionChange}
      />
      <FilterChipDropdown
        label="국적"
        value={activeLabels.nationality?.label ?? "전체"}
        isActive={nationality !== "all"}
        isLoading={isLoading}
        options={nationalityOptions}
        currentValue={nationality}
        onSelect={onNationalityChange}
      />
      <FilterChipDropdown
        label="콘텐츠"
        value={activeLabels.contentType?.label ?? "전체"}
        isActive={contentType !== "all"}
        isLoading={isLoading}
        options={contentTypeOptions}
        currentValue={contentType}
        onSelect={onContentTypeChange}
      />
      <FilterChipDropdown
        label="정렬"
        value={activeLabels.sort?.label ?? "영향력순"}
        isActive={sortBy !== "influence"}
        isLoading={isLoading}
        options={sortOptions}
        currentValue={sortBy}
        onSelect={(v) => onSortChange(v as CelebSortBy)}
      />
    </div>
  );
}
