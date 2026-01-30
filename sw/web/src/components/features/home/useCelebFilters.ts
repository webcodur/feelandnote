"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getCelebs } from "@/actions/home";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS, getContentUnit } from "@/constants/categories";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, CelebSortBy, TagCount } from "@/actions/home";

// #region 상수
export const SORT_OPTIONS: { value: CelebSortBy; label: string }[] = [
  { value: "influence", label: "영향력순" },
  { value: "follower", label: "팔로워순" },
  { value: "content_count", label: "보유 콘텐츠순" },
  { value: "name_asc", label: "이름순" },
  { value: "birth_date_desc", label: "최근 출생순" },
  { value: "birth_date_asc", label: "오래된 출생순" },
];

export type FilterType = "profession" | "nationality" | "contentType" | "sort" | "tag";

export const PAGE_SIZE = 24;

const VALID_SORT_VALUES: CelebSortBy[] = ["influence", "follower", "content_count", "name_asc", "birth_date_desc", "birth_date_asc"];
// #endregion

interface UseCelebFiltersParams {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  tagCounts: TagCount[];
  syncToUrl?: boolean;
}

export function useCelebFilters({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  tagCounts,
  syncToUrl = false,
}: UseCelebFiltersParams) {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [sortBy, setSortBy] = useState<CelebSortBy>(() => getInitialValue("sortBy", "influence", VALID_SORT_VALUES));
  const [tagId, setTagId] = useState<string>(() => getInitialValue("tag", ""));
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
  const [isInitialized, setIsInitialized] = useState(false);

  // URL 파라미터 업데이트 함수
  const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
    if (!syncToUrl) return;
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "" || (key === "page" && value === "1") || (key === "sortBy" && value === "influence")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [syncToUrl, searchParams, pathname, router]);

  // 초기 URL 파라미터로 데이터 로드
  useEffect(() => {
    if (!syncToUrl || isInitialized) return;
    const hasUrlFilters = searchParams.has("profession") || searchParams.has("nationality") ||
      searchParams.has("contentType") || searchParams.has("sortBy") ||
      searchParams.has("search") || searchParams.has("page") || searchParams.has("tag");
    if (hasUrlFilters) {
      loadCelebs(profession, nationality, contentType, sortBy, currentPage, appliedSearch, tagId);
    }
    setIsInitialized(true);
  }, [syncToUrl, isInitialized]);

  const contentUnit = contentType === "all" ? "개" : getContentUnit(contentType);

  const loadCelebs = useCallback(async (
    prof: string,
    nation: string,
    cType: string,
    sort: CelebSortBy,
    page: number,
    searchTerm: string,
    tag: string
  ) => {
    setIsLoading(true);
    const result = await getCelebs({
      page,
      limit: PAGE_SIZE,
      profession: prof,
      nationality: nation,
      contentType: cType,
      sortBy: sort,
      search: searchTerm || undefined,
      tagId: tag || undefined,
      minContentCount: 1,
    });
    setCelebs(result.celebs);
    setTotalPages(result.totalPages);
    setTotal(result.total);
    setIsLoading(false);
  }, []);

  const handleProfessionChange = useCallback((prof: string) => {
    setProfession(prof);
    setCurrentPage(1);
    loadCelebs(prof, nationality, contentType, sortBy, 1, search, tagId);
    updateUrlParams({ profession: prof, page: null });
  }, [loadCelebs, nationality, contentType, sortBy, search, tagId, updateUrlParams]);

  const handleNationalityChange = useCallback((nation: string) => {
    setNationality(nation);
    setCurrentPage(1);
    loadCelebs(profession, nation, contentType, sortBy, 1, search, tagId);
    updateUrlParams({ nationality: nation, page: null });
  }, [loadCelebs, profession, contentType, sortBy, search, tagId, updateUrlParams]);

  const handleContentTypeChange = useCallback((cType: string) => {
    setContentType(cType);
    setCurrentPage(1);
    loadCelebs(profession, nationality, cType, sortBy, 1, search, tagId);
    updateUrlParams({ contentType: cType, page: null });
  }, [loadCelebs, profession, nationality, sortBy, search, tagId, updateUrlParams]);

  const handleSortChange = useCallback((sort: CelebSortBy) => {
    setSortBy(sort);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, sort, 1, search, tagId);
    updateUrlParams({ sortBy: sort, page: null });
  }, [loadCelebs, profession, nationality, contentType, search, tagId, updateUrlParams]);

  const handleTagChange = useCallback((tag: string) => {
    setTagId(tag);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, sortBy, 1, search, tag);
    updateUrlParams({ tag: tag || null, page: null });
  }, [loadCelebs, profession, nationality, contentType, sortBy, search, updateUrlParams]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    loadCelebs(profession, nationality, contentType, sortBy, page, appliedSearch, tagId);
    updateUrlParams({ page: String(page) });
  }, [loadCelebs, profession, nationality, contentType, sortBy, appliedSearch, tagId, updateUrlParams]);

  // 검색어 입력 (UI만 업데이트, API 호출 안 함)
  const handleSearchInput = useCallback((term: string) => {
    setSearch(term);
  }, []);

  // 검색 실행 (버튼 클릭 또는 엔터)
  const handleSearchSubmit = useCallback(() => {
    setAppliedSearch(search);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, sortBy, 1, search, tagId);
    updateUrlParams({ search, page: null });
  }, [loadCelebs, profession, nationality, contentType, sortBy, search, tagId, updateUrlParams]);

  // 검색 초기화
  const handleSearchClear = useCallback(() => {
    setSearch("");
    setAppliedSearch("");
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, sortBy, 1, "", tagId);
    updateUrlParams({ search: null, page: null });
  }, [loadCelebs, profession, nationality, contentType, sortBy, tagId, updateUrlParams]);

  // 현재 선택된 값들의 라벨
  const activeLabels = useMemo(() => ({
    profession: CELEB_PROFESSION_FILTERS.find((f) => f.value === profession),
    nationality: nationalityCounts.find((n) => n.value === nationality),
    contentType: CONTENT_TYPE_FILTERS.find((c) => c.value === contentType),
    sort: SORT_OPTIONS.find((s) => s.value === sortBy),
    tag: tagCounts.find((t) => t.id === tagId),
  }), [profession, nationality, contentType, sortBy, nationalityCounts, tagId, tagCounts]);

  return {
    celebs,
    isLoading,
    profession,
    nationality,
    contentType,
    sortBy,
    tagId,
    search,
    contentUnit,
    activeFilter,
    setActiveFilter,
    activeLabels,
    professionCounts,
    nationalityCounts,
    contentTypeCounts,
    tagCounts,
    currentPage,
    totalPages,
    total,
    handleProfessionChange,
    handleNationalityChange,
    handleContentTypeChange,
    handleSortChange,
    handleTagChange,
    handlePageChange,
    handleSearchInput,
    handleSearchSubmit,
    handleSearchClear,
  };
}

// Rank → Variant 변환
export function getRankVariant(rank?: string) {
  if (rank === "S") return "crimson";
  if (rank === "A") return "gold";
  if (rank === "B") return "silver";
  if (rank === "C") return "bronze";
  return "iron";
}
