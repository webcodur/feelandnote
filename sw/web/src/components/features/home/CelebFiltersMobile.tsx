/*
  파일명: /components/features/home/CelebFiltersMobile.tsx
  기능: 셀럽 컨트롤 (모바일)
  책임: 검색, 정렬/필터, 액션 버튼 UI 제공
*/
"use client";

import { Search, X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
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
  extraButtons?: React.ReactNode;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
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
  extraButtons,
  isExpanded = true,
  onToggleExpand,
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
      {/* 셀럽 컨트롤 (Mobile) */}
      <div className="md:hidden mb-10">
        <div className="border border-white/20 rounded-xl overflow-hidden">
          {/* 타이틀 바 (클릭하면 접기/펼치기) */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 active:bg-white/10"
          >
            <SlidersHorizontal size={14} className="text-text-secondary" />
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Control Panel</span>
            <ChevronDown
              size={14}
              className={cn(
                "text-text-tertiary transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </button>

          {/* 접히는 영역 */}
          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              {/* 1행: 검색 */}
              <div className="flex gap-2 p-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="인물 검색..."
                    className="w-full h-10 ps-9 pe-8 bg-white/5 border border-accent/25 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
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
                  className="h-10 px-4 bg-white/5 border border-accent/25 hover:border-accent/50 disabled:opacity-50 text-text-primary text-sm font-medium rounded-lg shrink-0"
                >
                  검색
                </button>
              </div>
              {/* 구분선 */}
              <div className="h-px bg-accent/10" />
              {/* 2행: 필터 칩들 */}
              <div className="grid grid-cols-2 gap-2 p-3">
                <FilterChip label="직군" value={activeLabels.profession?.label ?? "전체"} isActive={profession !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("profession")} className="w-full" />
                <FilterChip label="국적" value={activeLabels.nationality?.label ?? "전체"} isActive={nationality !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("nationality")} className="w-full" />
                <FilterChip label="콘텐츠" value={activeLabels.contentType?.label ?? "전체"} isActive={contentType !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("contentType")} className="w-full" />
                <FilterChip label="정렬" value={activeLabels.sort?.label ?? "보유 콘텐츠순"} isActive={sortBy !== "content_count"} isLoading={isLoading} onClick={() => onFilterOpen("sort")} className="w-full" />
              </div>
              {/* 3행: 추가 버튼들 */}
              {extraButtons && (
                <>
                  <div className="h-px bg-accent/10" />
                  <div className="flex gap-2 p-3">
                    {extraButtons}
                  </div>
                </>
              )}
            </div>
          </div>
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
