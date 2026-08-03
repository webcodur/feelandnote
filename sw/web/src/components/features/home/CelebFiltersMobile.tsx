/*
  파일명: /components/features/home/CelebFiltersMobile.tsx
  기능: 셀럽 컨트롤 (모바일)
  책임: 검색, 정렬/필터, 액션 버튼 UI 제공
*/
"use client";

import { useMemo } from "react";
import { Search, X, SlidersHorizontal, ArrowUpDown, Briefcase, Globe, Layers, Users, Mars, Venus } from "lucide-react";
import { FilterChip, FilterModal, type FilterOption } from "@/components/shared/filters";
import ControlPanel from "@/components/shared/ControlPanel";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS, CATEGORIES } from "@/constants/categories";
import { PROFESSION_ICONS } from "@/constants/professionIcons";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import { SORT_VALUES, type FilterType } from "./useCelebFilters";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts, CelebSortBy } from "@/actions/home";
import { useTranslations } from "next-intl";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";

// 성별 아이콘 매핑
const GENDER_ICONS: Record<string, React.ReactNode> = {
  male: <Mars size={14} />,
  female: <Venus size={14} />,
};

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
    sort: CelebSortBy;
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
  isExpanded = true,
  onToggleExpand,
}: CelebFiltersMobileProps) {
  const getProfLabel = useProfessionLabel();
  const getCtLabel = useContentTypeLabel();
  const getNatLabel = useNationalityLabel();
  const getGenderLabel = useGenderLabel();
  const t = useTranslations("home.ui");
  const tExplore = useTranslations("explore.ui");

  // 필터별 옵션 생성 (아이콘 포함)
  const professionOptions: FilterOption[] = useMemo(() =>
    CELEB_PROFESSION_FILTERS.map(({ value }) => {
      const IconComp = PROFESSION_ICONS[value];
      return {
        value,
        label: getProfLabel(value),
        count: professionCounts[value] ?? 0,
        icon: IconComp ? <IconComp size={14} /> : undefined,
      };
    }), [professionCounts, getProfLabel]);

  const nationalityOptions: FilterOption[] = useMemo(() =>
    nationalityCounts.map(({ value, count }) => ({
      value,
      label: getNatLabel(value),
      count,
      icon: value !== "all" ? <span className="text-sm">{getCountryFlag(value)}</span> : undefined,
    })), [nationalityCounts, getNatLabel]);

  const contentTypeOptions: FilterOption[] = useMemo(() => {
    // 집계 RPC 전체가 0으로 실패해도 핵심 필터 기능까지 잠그지 않는다.
    const hasUsableCounts = CONTENT_TYPE_FILTERS.some(({ value }) => (contentTypeCounts[value] ?? 0) > 0);
    return CONTENT_TYPE_FILTERS.map(({ value }) => {
      const cat = CATEGORIES.find((c) => c.dbType === value);
      const LucideIcon = cat?.lucideIcon;
      return {
        value,
        label: getCtLabel(value),
        count: hasUsableCounts ? (contentTypeCounts[value] ?? 0) : undefined,
        icon: LucideIcon ? <LucideIcon size={14} /> : undefined,
      };
    });
  }, [contentTypeCounts, getCtLabel]);

  const genderOptions: FilterOption[] = useMemo(() =>
    genderCounts.map(({ value, count }) => ({
      value,
      label: getGenderLabel(value),
      count,
      icon: GENDER_ICONS[value] ?? undefined,
    })), [genderCounts, getGenderLabel]);

  const sortOptions: FilterOption[] = SORT_VALUES.map((value) => ({ value, label: t(`sort.${value}`) }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearchSubmit();
  };

  return (
    <>
      {/* 셀럽 컨트롤 (Mobile) */}
      <div className="mx-auto mb-10 max-w-xl md:hidden">
        <ControlPanel
          title={t("controlTitle")}
          icon={<SlidersHorizontal size={16} className="text-accent/70" />}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand ?? (() => {})}
          lineWidth="w-8"
        >
          {/* 1행: 인물 검색 */}
          <div className="flex gap-2 p-3">
            <div className="relative flex-1 group/search">
              <div className="absolute inset-0 bg-accent/5 blur-sm opacity-0 group-focus-within/search:opacity-100 transition-opacity rounded-md pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("searchPlaceholder")}
                className="w-full min-w-0 h-9 ps-3 pe-9 bg-black/40 border border-white/10 rounded-md text-sm text-text-primary placeholder: focus:outline-none focus:border-accent/40 focus:bg-black/60 transition-all font-sans relative z-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={onSearchClear}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full hover:text-text-primary transition-colors z-20"
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
          {/* 2~4행: 필터 2개 · 필터 2개 · 정렬 */}
          <div className="grid grid-cols-2 gap-2 p-3 pt-0">
            <FilterChip label={t("filterProfession")} value={getProfLabel(profession)} isActive={profession !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("profession")} className="w-full" icon={<Briefcase size={12} />} />
            <FilterChip label={t("filterNationality")} value={getNatLabel(nationality)} isActive={nationality !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("nationality")} className="w-full" icon={<Globe size={12} />} />
            <FilterChip label={t("filterContent")} value={getCtLabel(contentType)} isActive={contentType !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("contentType")} className="w-full" icon={<Layers size={12} />} />
            <FilterChip label={t("filterGender")} value={getGenderLabel(gender)} isActive={gender !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("gender")} className="w-full" icon={<Users size={12} />} />
            <FilterChip label={t("filterSort")} value={t(`sort.${sortBy}`)} isActive={sortBy !== "content_count"} isLoading={isLoading} onClick={() => onFilterOpen("sort")} className="col-span-2 w-full" icon={<ArrowUpDown size={12} />} />
          </div>
        </ControlPanel>
      </div>

      {/* 모달들 */}
      <FilterModal title={t("filterProfession")} isOpen={activeFilter === "profession"} current={profession} options={professionOptions} onClose={onFilterClose} onChange={onProfessionChange} />
      <FilterModal title={t("filterNationality")} isOpen={activeFilter === "nationality"} current={nationality} options={nationalityOptions} onClose={onFilterClose} onChange={onNationalityChange} searchable searchPlaceholder={tExplore("searchFilter")} />
      <FilterModal title={t("filterContent")} isOpen={activeFilter === "contentType"} current={contentType} options={contentTypeOptions} onClose={onFilterClose} onChange={onContentTypeChange} />
      <FilterModal title={t("filterGender")} isOpen={activeFilter === "gender"} current={gender} options={genderOptions} onClose={onFilterClose} onChange={onGenderChange} />
      <FilterModal title={t("filterSort")} isOpen={activeFilter === "sort"} current={sortBy} options={sortOptions} onClose={onFilterClose} onChange={(v) => onSortChange(v as CelebSortBy)} />
    </>
  );
}
