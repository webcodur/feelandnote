/*
  파일명: /components/features/home/CelebFiltersDesktop.tsx
  기능: 셀럽 필터 (데스크톱)
  책임: 직군, 국적, 콘텐츠, 정렬 필터 UI 제공
*/
"use client";

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
}

export default function CelebFiltersDesktop({
  profession,
  nationality,
  contentType,
  sortBy,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  isLoading,
  activeLabels,
  onProfessionChange,
  onNationalityChange,
  onContentTypeChange,
  onSortChange,
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

  return (
    <div className="hidden md:flex items-center gap-3 mb-6">
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
