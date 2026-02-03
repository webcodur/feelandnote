/*
  파일명: /components/features/home/CelebFiltersDesktop.tsx
  기능: 셀럽 컨트롤 (PC) - 1행 정렬/필터 영역
  책임: 직군, 국적, 콘텐츠, 정렬 필터 UI 제공
*/
"use client";

import { Search, X, ArrowUpDown } from "lucide-react";
import { FilterChipDropdown, type FilterOption } from "@/components/shared/filters";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { SORT_OPTIONS } from "./useCelebFilters";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts, CelebSortBy } from "@/actions/home";

interface CelebFiltersDesktopProps {
  profession: string;
  nationality: string;
  contentType: string;
  gender: string;
  sortBy: CelebSortBy;
  search: string;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
  isLoading: boolean;
  activeLabels: {
    profession?: { label: string };
    nationality?: { label: string };
    contentType?: { label: string };
    gender?: { label: string };
    sort?: { label: string };
  };
  onProfessionChange: (value: string) => void;
  onNationalityChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onSortChange: (value: CelebSortBy) => void;
  onSearchInput: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  hideSearch?: boolean;
  wrapperClassName?: string;
}

export default function CelebFiltersDesktop({
  profession,
  nationality,
  contentType,
  gender,
  sortBy,
  search,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
  isLoading,
  activeLabels,
  onProfessionChange,
  onNationalityChange,
  onContentTypeChange,
  onGenderChange,
  onSortChange,
  onSearchInput,
  onSearchSubmit,
  onSearchClear,
  hideSearch = false,
  wrapperClassName,
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

  const genderOptions: FilterOption[] = genderCounts.map(({ value, label, count }) => ({
    value,
    label,
    count,
  }));

  const sortOptions: FilterOption[] = SORT_OPTIONS.map(({ value, label }) => ({ value, label }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearchSubmit();
  };

  return (
    <div className={wrapperClassName ?? "hidden md:flex items-center justify-center gap-3 mb-4"}>
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
        label="성별"
        value={activeLabels.gender?.label ?? "전체"}
        isActive={gender !== "all"}
        isLoading={isLoading}
        options={genderOptions}
        currentValue={gender}
        onSelect={onGenderChange}
      />
      <FilterChipDropdown
        label="정렬"
        value={activeLabels.sort?.label ?? "보유 콘텐츠순"}
        isActive={sortBy !== "content_count"}
        isLoading={isLoading}
        options={sortOptions}
        currentValue={sortBy}
        onSelect={(v) => onSortChange(v as CelebSortBy)}
        icon={<ArrowUpDown size={14} />}
      />
    </div>
  );
}
