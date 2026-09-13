"use client";

import { useState, useCallback, useMemo, useEffect, useEffectEvent, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { getCelebs } from "@/actions/home";
import { CELEB_PROFESSION_FILTERS, DEFAULT_EXPLORE_PROFESSION } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS, getContentUnit } from "@/constants/categories";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts, CelebSortBy } from "@/actions/home";
import { CELEB_TIERS, isCelebTier, parseCelebTiers, parseCelebRealities, type CelebTier, type CelebReality } from "@feelandnote/shared/constants/celeb-tiers";
import { DEFAULT_CELEB_CONTENT_PRESENCE, parseCelebContentPresence, type CelebContentPresence } from "@/constants/celebContentPresence";
import { CELEB_SORT_OPTIONS, DEFAULT_EXPLORE_SORT } from "@/constants/celebSort";
import { parseTrendCountry, type TrendCountry } from "@/constants/trendCountries";

// #region 상수
export const SORT_VALUES = CELEB_SORT_OPTIONS;

export type FilterType = "profession" | "nationality" | "contentType" | "contentPresence" | "gender" | "sort" | "tier" | "birthYear";

const DEFAULT_PAGE_SIZE = 24;
export const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

// #endregion

interface UseCelebFiltersParams {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  initialTrendCountry?: TrendCountry;
  initialTrend?: Awaited<ReturnType<typeof getCelebs>>["trend"];
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
  initialTrendCountry = "KR",
  initialTrend,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
  syncToUrl = false,
  includeInactive = false,
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
  const [profession, setProfession] = useState<string>(() => getInitialValue("profession", syncToUrl ? DEFAULT_EXPLORE_PROFESSION : "all"));
  const [nationality, setNationality] = useState<string>(() => getInitialValue("nationality", "all"));
  const [contentType, setContentType] = useState<string>(() => getInitialValue("contentType", "all"));
  const [contentPresence, setContentPresence] = useState<CelebContentPresence>(() => parseCelebContentPresence(syncToUrl ? searchParams.get("contentPresence") : undefined, syncToUrl ? DEFAULT_CELEB_CONTENT_PRESENCE : "all"));
  const [gender, setGender] = useState<string>(() => getInitialValue("gender", "all"));
  const [sortBy, setSortBy] = useState<CelebSortBy>(() => getInitialValue("sortBy", syncToUrl ? DEFAULT_EXPLORE_SORT : "daily_recommend", SORT_VALUES));
  const [trendCountry, setTrendCountry] = useState<TrendCountry>(() => (syncToUrl ? parseTrendCountry(searchParams.get("trendCountry")) : undefined) ?? initialTrendCountry);
  const [trend, setTrend] = useState(initialTrend);
  const [search, setSearch] = useState<string>(() => getInitialValue("search", ""));
  const [appliedSearch, setAppliedSearch] = useState<string>(() => getInitialValue("search", ""));
  const [tagId] = useState(() => {
    const value = getInitialValue("tagId", "");
    return value && value !== "all" ? value : undefined;
  });
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
  // 생년 범위 필터(연도, BC는 음수). 미지정이면 제한하지 않는다.
  const getInitialYear = (key: string): number | undefined => {
    if (!syncToUrl) return undefined;
    const raw = searchParams.get(key);
    if (!raw) return undefined;
    const year = parseInt(raw, 10);
    return isNaN(year) ? undefined : year;
  };
  const [birthYearMin, setBirthYearMin] = useState<number | undefined>(() => getInitialYear("byMin"));
  const [birthYearMax, setBirthYearMax] = useState<number | undefined>(() => getInitialYear("byMax"));
  const getPageHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === "country_trending") params.set("trendCountry", trendCountry);
    if (page === 1) params.delete("page");
    else params.set("page", String(page));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const previousIncludeInactiveRef = useRef(includeInactive);
  const latestRequestRef = useRef(0);

  // URL 파라미터 업데이트 (서버 재렌더링 없이 URL만 변경)
  const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
    if (!syncToUrl) return;
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === "country_trending") params.set("trendCountry", trendCountry);
    Object.entries(updates).forEach(([key, value]) => {
      const isDefault = key === "profession" ? value === DEFAULT_EXPLORE_PROFESSION
        : key === "contentPresence" ? value === DEFAULT_CELEB_CONTENT_PRESENCE : value === "all";
      if (value === null || isDefault || value === "" || (key === "page" && value === "1") || (key === "sortBy" && value === DEFAULT_EXPLORE_SORT)) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const pathname = window.location.pathname;
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    window.history.replaceState(null, "", `${newUrl}${window.location.hash}`);
  }, [syncToUrl, searchParams, sortBy, trendCountry]);

  // A country inferred on the server becomes explicit before sharing or reloading.
  useEffect(() => {
    if (syncToUrl && sortBy === "country_trending" && searchParams.get("trendCountry") !== trendCountry) {
      updateUrlParams({ trendCountry });
    }
  }, [syncToUrl, sortBy, trendCountry, searchParams, updateUrlParams]);

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
    tiersOverride?: CelebTier[],
    birthYearOverride?: { min?: number; max?: number },
    contentPresenceOverride?: CelebContentPresence,
    trendCountryOverride?: TrendCountry
  ) => {
    const requestId = ++latestRequestRef.current;
    setIsLoading(true);
    const isInactive = inactive ?? includeInactive;
    try {
      const result = await getCelebs({
        page,
        limit: limitOverride ?? pageSize,
        profession: prof,
        nationality: nation,
        contentType: cType,
        contentPresence: contentPresenceOverride ?? contentPresence,
        gender: gend,
        sortBy: sort,
        trendCountry: trendCountryOverride ?? trendCountry,
        search: searchTerm || undefined,
        tagId,
        minContentCount: 0,
        includeInactive: isInactive,
        tiers: tiersOverride ?? tiers,
        realities,
        birthYearMin: birthYearOverride ? birthYearOverride.min : birthYearMin,
        birthYearMax: birthYearOverride ? birthYearOverride.max : birthYearMax,
      });
      if (requestId !== latestRequestRef.current) return;
      setCelebs(result.celebs);
      setTotalPages(result.totalPages);
      setTotal(result.total);
      setTrend(result.trend);
    } finally {
      if (requestId === latestRequestRef.current) setIsLoading(false);
    }
  }, [includeInactive, pageSize, tiers, realities, birthYearMin, birthYearMax, contentPresence, trendCountry, tagId]);

  // 서버에서 URL 파라미터 기반으로 이미 패칭된 데이터를 사용하므로 초기 렌더에서는 재패칭하지 않는다.
  // 다른 필터 변경으로 callback이 새로 만들어져도 includeInactive가 실제로 바뀐 경우에만 호출한다.
  const reloadForIncludeInactiveChange = useEffectEvent(() => {
    void loadCelebs(profession, nationality, contentType, gender, sortBy, 1, appliedSearch, includeInactive);
    setCurrentPage(1);
  });

  useEffect(() => {
    if (previousIncludeInactiveRef.current === includeInactive) return;
    previousIncludeInactiveRef.current = includeInactive;
    reloadForIncludeInactiveChange();
  }, [includeInactive]);

  const contentUnit = contentType === "all" ? null : getContentUnit(contentType);

  const handleProfessionChange = useCallback((prof: string) => {
    setProfession(prof);
    setCurrentPage(1);
    loadCelebs(prof, nationality, contentType, gender, sortBy, 1, appliedSearch);
    updateUrlParams({ profession: prof, page: null });
  }, [loadCelebs, nationality, contentType, gender, sortBy, appliedSearch, updateUrlParams]);

  const handleNationalityChange = useCallback((nation: string) => {
    setNationality(nation);
    setCurrentPage(1);
    loadCelebs(profession, nation, contentType, gender, sortBy, 1, appliedSearch);
    updateUrlParams({ nationality: nation, page: null });
  }, [loadCelebs, profession, contentType, gender, sortBy, appliedSearch, updateUrlParams]);

  const handleContentTypeChange = useCallback((cType: string) => {
    setContentType(cType);
    setCurrentPage(1);
    loadCelebs(profession, nationality, cType, gender, sortBy, 1, appliedSearch);
    updateUrlParams({ contentType: cType, page: null });
  }, [loadCelebs, profession, nationality, gender, sortBy, appliedSearch, updateUrlParams]);

  const handleGenderChange = useCallback((gend: string) => {
    setGender(gend);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gend, sortBy, 1, appliedSearch);
    updateUrlParams({ gender: gend, page: null });
  }, [loadCelebs, profession, nationality, contentType, sortBy, appliedSearch, updateUrlParams]);

  const handleContentPresenceChange = useCallback((value: string) => {
    const next = parseCelebContentPresence(value);
    setContentPresence(next);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sortBy, 1, appliedSearch, undefined, undefined, undefined, undefined, next);
    updateUrlParams({ contentPresence: next, page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, sortBy, appliedSearch, updateUrlParams]);

  const handleSortChange = useCallback((sort: CelebSortBy) => {
    setSortBy(sort);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sort, 1, appliedSearch);
    updateUrlParams({ sortBy: sort, ...(sort === "country_trending" ? { trendCountry } : {}), page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, appliedSearch, updateUrlParams, trendCountry]);

  const handleTrendCountryChange = useCallback((country: TrendCountry) => {
    setTrendCountry(country);
    setCurrentPage(1);
    setTrend(undefined);
    void loadCelebs(profession, nationality, contentType, gender, sortBy, 1, appliedSearch, undefined, undefined, undefined, undefined, undefined, country);
    updateUrlParams({ trendCountry: country, page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, sortBy, appliedSearch, updateUrlParams]);

  // 등급 필터 변경. 전체 등급을 고르면 좁히는 의미가 없으므로 URL에서 지운다.
  const handleTiersChange = useCallback((next: CelebTier[]) => {
    const value = next.length > 0 ? next : undefined;
    setTiers(value);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sortBy, 1, appliedSearch, undefined, undefined, value);
    const isDefault = !value || (value.length === CELEB_TIERS.length && CELEB_TIERS.every(t => value.includes(t)));
    updateUrlParams({ tier: isDefault ? null : value.join(","), page: null });
  }, [loadCelebs, profession, nationality, contentType, gender, sortBy, appliedSearch, updateUrlParams]);

  // 생년 범위 변경. 전체 범위(양쪽 다 undefined)면 좁히는 의미가 없으므로 URL에서 지운다.
  const handleBirthYearChange = useCallback((min: number | undefined, max: number | undefined) => {
    setBirthYearMin(min);
    setBirthYearMax(max);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, gender, sortBy, 1, appliedSearch, undefined, undefined, undefined, { min, max });
    updateUrlParams({
      byMin: min === undefined ? null : String(min),
      byMax: max === undefined ? null : String(max),
      page: null,
    });
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
    contentPresence,
    gender,
    sortBy,
    trendCountry,
    trend,
    handleTrendCountryChange,
    search,
    tiers: tiers ?? [...CELEB_TIERS],
    handleTiersChange,
    tierValue,
    handleTierValueChange,
    realities,
    birthYearMin,
    birthYearMax,
    handleBirthYearChange,
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
    handleContentPresenceChange,
    handleGenderChange,
    handleSortChange,
    handlePageChange,
    getPageHref,
    handlePageSizeChange,
    handleSearchInput,
    handleSearchSubmit,
    handleSearchClear,
  };
}
