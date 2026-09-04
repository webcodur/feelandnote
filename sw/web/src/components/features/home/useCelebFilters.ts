"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { getCelebs } from "@/actions/home";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS, getContentUnit } from "@/constants/categories";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts, CelebSortBy } from "@/actions/home";
import { CELEB_TIERS, isCelebTier, parseCelebTiers, parseCelebRealities, type CelebTier, type CelebReality } from "@feelandnote/shared/constants/celeb-tiers";

// #region 상수
export const SORT_VALUES: CelebSortBy[] = [
  "daily_recommend", "composite", "follower", "influence",
  "content_count", "name_asc", "birth_date_desc", "birth_date_asc",
];

export type FilterType = "profession" | "nationality" | "contentType" | "gender" | "sort" | "tier";

const DEFAULT_PAGE_SIZE = 24;
export const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const VALID_SORT_VALUES: CelebSortBy[] = ["daily_recommend", "composite", "influence", "follower", "content_count", "name_asc", "birth_date_desc", "birth_date_asc"];
// #endregion

interface UseCelebFiltersParams {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
  syncToUrl?: boolean;
  includeInactive?: boolean;
  onIncludeInactiveChange?: (value: boolean) => void;
}

export function useCelebFilters({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
  syncToUrl = false,
  includeInactive = false,
  onIncludeInactiveChange,
}: UseCelebFiltersParams) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL에서 초기값 읽기
  const getInitialValue = <T extends string>(key: string, defaultValue: T, validValues?: T[]): T => {
    if (!syncToUrl) return defaultValue;
    const urlValue = searchParams.get(key);
    if (!urlValue) return defaultValue;
    if (validValues && !validValues.includes(urlValue as T)) return defaultValue;
    return urlValue as T;
  };

  const [celebs, setCelebs] = useState<CelebProfile[]>(initialCelebs);
  const [isLoading, setIsLoading] = useState(false);
  const [profession, setProfession] = useState<string>(() => getInitialValue("profession", "all"));
  const [nationality, setNationality] = useState<string>(() => getInitialValue("nationality", "all"));
  const [contentType, setContentType] = useState<string>(() => getInitialValue("contentType", "all"));
  const [gender, setGender] = useState<string>(() => getInitialValue("gender", "all"));
  const [sortBy, setSortBy] = useState<CelebSortBy>(() => getInitialValue("sortBy", "daily_recommend", VALID_SORT_VALUES));
  const [search, setSearch] = useState<string>(() => getInitialValue("search", ""));
  const [appliedSearch, setAppliedSearch] = useState<string>(() => getInitialValue("search", ""));
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const [currentPage, setCurrentPage] = useState(() => {
    if (!syncToUrl) return 1;
    const page = parseInt(searchParams.get("page") || "1", 10);
    return isNaN(page) || page < 1 ? 1 : page;
  });
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [total, setTotal] = useState(initialTotal);
  const [pageSize, setPageSize] = useState(() => {
    if (!syncToUrl) return DEFAULT_PAGE_SIZE;
    const ps = parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10);
    return PAGE_SIZE_OPTIONS.includes(ps) ? ps : DEFAULT_PAGE_SIZE;
  });
  // 파이프라인 등급 좁히기(full·light). 미지정이면 제한하지 않는다.
  const [tiers, setTiers] = useState<CelebTier[] | undefined>(() => {
    if (!syncToUrl) return undefined;
    return parseCelebTiers(searchParams.get("tier"));
  });
  // 실존 축 필터. 미지정이면 getCelebs가 기본(REAL·BOTH)만 노출한다 — FICTION은 빠진다.
  // 값은 URL(상단 검색이 붙이는 reality=)에서만 들어오므로 화면에서 바꾸는 setter는 두지 않는다.
  const [realities] = useState<CelebReality[] | undefined>(() => {
    if (!syncToUrl) return undefined;
    return parseCelebRealities(searchParams.get("reality"));
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // URL 파라미터 업데이트 (서버 재렌더링 없이 URL만 변경)
  const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
    if (!syncToUrl) return;
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "" || (key === "page" && value === "1") || (key === "sortBy" && value === "daily_recommend")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    window.history.replaceState(null, "", newUrl);
  }, [syncToUrl, searchParams, pathname]);

  // 서버에서 URL 파라미터 기반으로 이미 패칭된 데이터를 사용하므로 재패칭 불필요
  useEffect(() => {
    if (!syncToUrl || isInitialized) return;
    setIsInitialized(true);
  }, [syncToUrl, isInitialized]);

  const contentUnit = contentType === "all" ? null : getContentUnit(contentType);

  // includeInactive 변경 시 데이터 리로드
  useEffect(() => {
    if (!isInitialized) return;
    loadCelebs(profession, nationality, contentType, gender, sortBy, 1, appliedSearch, includeInactive);
    setCurrentPage(1);
  }, [includeInactive]);

  const loadCelebs = useCallback(async (
    prof: string,
    nation: string,
    cType: string,
    gend: string,
    sort: CelebSortBy,
    page: number,
    searchTerm: string,
    inactive?: boolean,
    limitOverride?: number,
    tiersOverride?: CelebTier[]
  ) => {
    setIsLoading(true);
    const isInactive = inactive ?? includeInactive;
    const result = await getCelebs({
      page,
      limit: limitOverride ?? pageSize,
      profession: prof,
      nationality: nation,
      contentType: cType,
      gender: gend,
      sortBy: sort,
      search: searchTerm || undefined,
      minContentCount: 0,
      includeInactive: isInactive,
      tiers: tiersOverride ?? tiers,
      realities,
    });
    setCelebs(result.celebs);
    setTotalPages(result.totalPages);
    setTotal(result.total);
    setIsLoading(false);
  }, [includeInactive, pageSize, tiers, realities]);

  const handleProfessionChange = useCallback((prof: string) => {
    setProfession(prof);
    setCurrentPage(1);
    loadCelebs(prof, nationality, contentType, gender, sortBy, 1, search);
    updateUrlParams({ profession: prof, page: null });
  }, [loadCelebs, nationality, contentType, gender, sortBy, search, updateUrlParams]);

  const handleNationalityChange = useCallback((nation: string) => {
    setNationality(nation);
    setCurrentPage(1);
    loadCelebs(profession, nation, contentType, gender, sortBy, 1, search);
    updateUrlParams({ nationality: nation, page: null });
  }, [loadCelebs, profession, contentType, gender, sortBy, search, updateUrlParams]);

  const handleContentTypeChange = useCallback((cType: string) => {
    setContentType(cType);
    setCurrentPage(1);
    loadCelebs(profession, nationality, cType, gender, sortBy, 1, search);
    updateUrlParams({ contentType: cType, page: null });
  }, [loadCelebs, profession, nationality, gender, sortBy, search, updateUrlParams]);

  const handleGenderChange = useCallback((gend: string) => {
    setGender(gend);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gend, sortBy, 1, search);
    updateUrlParams({ gender: gend, page: null });
  }, [loadCelebs, profession, nationality, contentType, sortBy, search, updateUrlParams]);

  const handleSortChange = useCallback((sort: CelebSortBy) => {
    setSortBy(sort);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sort, 1, search);
    updateUrlParams({ sortBy: sort, page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, search, updateUrlParams]);

  // 등급 필터 변경. 전체 등급을 고르면 좁히는 의미가 없으므로 URL에서 지운다.
  const handleTiersChange = useCallback((next: CelebTier[]) => {
    const value = next.length > 0 ? next : undefined;
    setTiers(value);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sortBy, 1, appliedSearch, undefined, undefined, value);
    const isDefault = !value || (value.length === CELEB_TIERS.length && CELEB_TIERS.every(t => value.includes(t)));
    updateUrlParams({ tier: isDefault ? null : value.join(","), page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, sortBy, appliedSearch, updateUrlParams]);

  // 필터 UI는 등급을 한 값("all"·"full"·"light")으로 다룬다. 내부 배열과의 변환은 여기서만 한다.
  const tierValue = tiers?.length === 1 ? tiers[0] : "all";
  const handleTierValueChange = useCallback((value: string) => {
    handleTiersChange(isCelebTier(value) ? [value] : []);
  }, [handleTiersChange]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    loadCelebs(profession, nationality, contentType, gender, sortBy, page, appliedSearch);
    updateUrlParams({ page: String(page) });
  }, [loadCelebs, profession, nationality, contentType, gender, sortBy, appliedSearch, updateUrlParams]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sortBy, 1, appliedSearch, undefined, size);
    updateUrlParams({ pageSize: size === DEFAULT_PAGE_SIZE ? null : String(size), page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, sortBy, appliedSearch, updateUrlParams]);

  // 검색어 입력 (UI만 업데이트, API 호출 안 함)
  const handleSearchInput = useCallback((term: string) => {
    setSearch(term);
  }, []);

  // 검색 실행 (버튼 클릭 또는 엔터)
  const handleSearchSubmit = useCallback(() => {
    setAppliedSearch(search);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sortBy, 1, search);
    updateUrlParams({ search, page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, sortBy, search, updateUrlParams]);

  // 검색 초기화
  const handleSearchClear = useCallback(() => {
    setSearch("");
    setAppliedSearch("");
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sortBy, 1, "");
    updateUrlParams({ search: null, page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, sortBy, updateUrlParams]);

  // 현재 선택된 값들의 라벨
  const activeLabels = useMemo(() => ({
    profession: CELEB_PROFESSION_FILTERS.find((f) => f.value === profession),
    nationality: nationalityCounts.find((n) => n.value === nationality),
    contentType: CONTENT_TYPE_FILTERS.find((c) => c.value === contentType),
    gender: genderCounts.find((g) => g.value === gender),
    sort: sortBy,
  }), [profession, nationality, contentType, gender, sortBy, nationalityCounts, genderCounts]);

  return {
    celebs,
    isLoading,
    profession,
    nationality,
    contentType,
    gender,
    sortBy,
    search,
    tiers: tiers ?? [...CELEB_TIERS],
    handleTiersChange,
    tierValue,
    handleTierValueChange,
    realities,
    contentUnit,
    activeFilter,
    setActiveFilter,
    activeLabels,
    professionCounts,
    nationalityCounts,
    contentTypeCounts,
    genderCounts,
    currentPage,
    totalPages,
    total,
    pageSize,
    handleProfessionChange,
    handleNationalityChange,
    handleContentTypeChange,
    handleGenderChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
    handleSearchInput,
    handleSearchSubmit,
    handleSearchClear,
  };
}
