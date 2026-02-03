/*
  파일명: /components/features/home/CelebFiltersMobile.tsx
  기능: 셀럽 컨트롤 (모바일)
  책임: 검색, 정렬/필터, 액션 버튼 UI 제공
*/
"use client";

import { Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterChip, FilterModal, type FilterOption } from "@/components/shared/filters";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { SORT_OPTIONS, type FilterType } from "./useCelebFilters";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts, CelebSortBy } from "@/actions/home";

interface CelebFiltersMobileProps {
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
  activeFilter: FilterType | null;
  activeLabels: {
    profession?: { label: string };
    nationality?: { label: string };
    contentType?: { label: string };
    gender?: { label: string };
    sort?: { label: string };
  };
  onFilterOpen: (filter: FilterType) => void;
  onFilterClose: () => void;
  onProfessionChange: (value: string) => void;
  onNationalityChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onGenderChange: (value: string) => void;
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
  gender,
  sortBy,
  search,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
  isLoading,
  activeFilter,
  activeLabels,
  onFilterOpen,
  onFilterClose,
  onProfessionChange,
  onNationalityChange,
  onContentTypeChange,
  onGenderChange,
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
    <>
      {/* 셀럽 컨트롤 (Mobile) */}
      <div className="md:hidden mb-10">
        <div className="border border-white/10 bg-black/40 backdrop-blur-md rounded-lg overflow-hidden relative group">
          {/* 타이틀 바 (클릭하면 접기/펼치기) */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-white/5 border-b border-white/5 hover:bg-white/10 transition-all z-10"
          >
            <div className={`h-px w-8 bg-gradient-to-r from-transparent to-accent/50 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-50'}`} />
            
            <span className="font-sans text-base font-bold text-accent tracking-[0.2em] drop-shadow-sm flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-accent/70" />
              탐색 제어
            </span>
            
            <div className={`h-px w-8 bg-gradient-to-l from-transparent to-accent/50 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-50'}`} />
          </button>

          {/* 접히는 영역 */}
          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              {/* 1행: 검색 */}
              <div className="flex gap-2 p-3">
                <div className="relative flex-1 group/search">
                  <div className="absolute inset-0 bg-accent/5 blur-sm opacity-0 group-focus-within/search:opacity-100 transition-opacity rounded-md pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="인물 검색..."
                    className="w-full min-w-0 h-9 ps-3 pe-9 bg-black/40 border border-white/10 rounded-md text-sm text-text-primary placeholder:text-text-tertiary/70 focus:outline-none focus:border-accent/40 focus:bg-black/60 transition-all font-sans relative z-10"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={onSearchClear}
                      className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-text-tertiary hover:text-text-primary transition-colors z-20"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onSearchSubmit}
                  disabled={isLoading}
                  className="h-9 w-9 flex items-center justify-center bg-accent/10 hover:bg-accent/20 border border-accent/30 hover:border-accent/60 disabled:opacity-50 text-accent rounded-md transition-all duration-300"
                >
                  <Search size={16} />
                </button>
              </div>
              {/* 2행: 필터 칩들 */}
              <div className="grid grid-cols-2 gap-2 p-3">
                <FilterChip label="직군" value={activeLabels.profession?.label ?? "전체"} isActive={profession !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("profession")} className="w-full" />
                <FilterChip label="국적" value={activeLabels.nationality?.label ?? "전체"} isActive={nationality !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("nationality")} className="w-full" />
                <FilterChip label="콘텐츠" value={activeLabels.contentType?.label ?? "전체"} isActive={contentType !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("contentType")} className="w-full" />
                <FilterChip label="성별" value={activeLabels.gender?.label ?? "전체"} isActive={gender !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("gender")} className="w-full" />
                <FilterChip label="정렬" value={activeLabels.sort?.label ?? "보유 콘텐츠순"} isActive={sortBy !== "content_count"} isLoading={isLoading} onClick={() => onFilterOpen("sort")} className="w-full col-span-2" icon={<ArrowUpDown size={12} />} />
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
      <FilterModal title="성별" isOpen={activeFilter === "gender"} current={gender} options={genderOptions} onClose={onFilterClose} onChange={onGenderChange} />
      <FilterModal title="정렬" isOpen={activeFilter === "sort"} current={sortBy} options={sortOptions} onClose={onFilterClose} onChange={(v) => onSortChange(v as CelebSortBy)} />
    </>
  );
}
