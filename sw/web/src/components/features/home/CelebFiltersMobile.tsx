/*
  파일명: /components/features/home/CelebFiltersMobile.tsx
  기능: 셀럽 필터 (모바일)
  책임: 직군, 국적, 콘텐츠, 정렬 필터 UI 제공 (칩 + 모달 방식)
*/
"use client";

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
}

export default function CelebFiltersMobile({
  profession,
  nationality,
  contentType,
  sortBy,
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

  return (
    <>
      {/* 필터 칩들 - 가로 스크롤 */}
      <div className="md:hidden mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 min-w-max pb-1">
          <FilterChip label="직군" value={activeLabels.profession?.label ?? "전체"} isActive={profession !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("profession")} />
          <div className="w-px h-4 bg-accent/20 mx-1" />
          <FilterChip label="국적" value={activeLabels.nationality?.label ?? "전체"} isActive={nationality !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("nationality")} />
          <div className="w-px h-4 bg-accent/20 mx-1" />
          <FilterChip label="콘텐츠" value={activeLabels.contentType?.label ?? "전체"} isActive={contentType !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("contentType")} />
          <div className="w-px h-4 bg-accent/20 mx-1" />
          <FilterChip label="정렬" value={activeLabels.sort?.label ?? "영향력순"} isActive={sortBy !== "influence"} isLoading={isLoading} onClick={() => onFilterOpen("sort")} />
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
