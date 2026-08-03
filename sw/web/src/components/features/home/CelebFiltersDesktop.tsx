/*
  파일명: /components/features/home/CelebFiltersDesktop.tsx
  기능: 셀럽 컨트롤 (PC) - 1행 정렬/필터 영역
  책임: 직군, 국적, 콘텐츠, 성별, 정렬 필터 UI 제공
*/
"use client";

import { useMemo } from "react";
import { Search, X, ArrowUpDown, Briefcase, Globe, Layers, Users, Mars, Venus } from "lucide-react";
import { FilterCombobox, type FilterOption } from "@/components/shared/filters";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { CATEGORIES } from "@/constants/categories";
import { PROFESSION_ICONS } from "@/constants/professionIcons";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import { SORT_VALUES } from "./useCelebFilters";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts, CelebSortBy } from "@/actions/home";
import { useTranslations } from "next-intl";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";

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
    sort: CelebSortBy;
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

// 성별 아이콘 매핑
const GENDER_ICONS: Record<string, React.ReactNode> = {
  male: <Mars size={14} />,
  female: <Venus size={14} />,
};

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
    <div className={wrapperClassName ?? "hidden md:flex items-center justify-center gap-3 mb-4"}>
      {/* 검색 입력 - hideSearch가 false일 때만 표시 */}
      {!hideSearch && (
        <div className="relative flex-1 max-w-xs flex gap-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("searchPlaceholder")}
              className="w-full h-9 ps-9 pe-8 bg-bg-card border border-border rounded-lg text-sm text-text-primary placeholder: focus:outline-none focus:border-accent"
            />
            {search && (
              <button
                type="button"
                onClick={onSearchClear}
                className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
              >
                <X size={14} className="" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onSearchSubmit}
            disabled={isLoading}
            className="h-9 px-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {t("searchButton")}
          </button>
        </div>
      )}

      <FilterCombobox
        label={t("filterProfession")}
        value={getProfLabel(profession)}
        isActive={profession !== "all"}
        isLoading={isLoading}
        options={professionOptions}
        currentValue={profession}
        onSelect={onProfessionChange}
        icon={<Briefcase size={14} />}
      />
      <FilterCombobox
        label={t("filterNationality")}
        value={getNatLabel(nationality)}
        isActive={nationality !== "all"}
        isLoading={isLoading}
        options={nationalityOptions}
        currentValue={nationality}
        onSelect={onNationalityChange}
        icon={<Globe size={14} />}
        searchable
        searchPlaceholder={tExplore("searchFilter")}
      />
      <FilterCombobox
        label={t("filterContent")}
        value={getCtLabel(contentType)}
        isActive={contentType !== "all"}
        isLoading={isLoading}
        options={contentTypeOptions}
        currentValue={contentType}
        onSelect={onContentTypeChange}
        icon={<Layers size={14} />}
      />
      <FilterCombobox
        label={t("filterGender")}
        value={getGenderLabel(gender)}
        isActive={gender !== "all"}
        isLoading={isLoading}
        options={genderOptions}
        currentValue={gender}
        onSelect={onGenderChange}
        icon={<Users size={14} />}
      />
      <FilterCombobox
        label={t("filterSort")}
        value={t(`sort.${sortBy}`)}
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
