"use client";

import { useState, useCallback, useMemo } from "react";
import { getCelebs } from "@/actions/home";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS, getContentUnit } from "@/constants/categories";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, CelebSortBy } from "@/actions/home";

// #region 상수
export const SORT_OPTIONS: { value: CelebSortBy; label: string }[] = [
  { value: "influence", label: "영향력순" },
  { value: "follower", label: "팔로워순" },
  { value: "name_asc", label: "이름순" },
  { value: "birth_date_desc", label: "최근 출생순" },
  { value: "birth_date_asc", label: "오래된 출생순" },
];

export type FilterType = "profession" | "nationality" | "contentType" | "sort";

export const PAGE_SIZE = 24;
// #endregion

interface UseCelebFiltersParams {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
}

export function useCelebFilters({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
}: UseCelebFiltersParams) {
  const [celebs, setCelebs] = useState<CelebProfile[]>(initialCelebs);
  const [isLoading, setIsLoading] = useState(false);
  const [profession, setProfession] = useState("all");
  const [nationality, setNationality] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [sortBy, setSortBy] = useState<CelebSortBy>("influence");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [total, setTotal] = useState(initialTotal);

  const contentUnit = contentType === "all" ? "개" : getContentUnit(contentType);

  const loadCelebs = useCallback(async (
    prof: string,
    nation: string,
    cType: string,
    sort: CelebSortBy,
    page: number,
    searchTerm: string
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
    });
    setCelebs(result.celebs);
    setTotalPages(result.totalPages);
    setTotal(result.total);
    setIsLoading(false);
  }, []);

  const handleProfessionChange = useCallback((prof: string) => {
    setProfession(prof);
    setCurrentPage(1);
    loadCelebs(prof, nationality, contentType, sortBy, 1, search);
  }, [loadCelebs, nationality, contentType, sortBy, search]);

  const handleNationalityChange = useCallback((nation: string) => {
    setNationality(nation);
    setCurrentPage(1);
    loadCelebs(profession, nation, contentType, sortBy, 1, search);
  }, [loadCelebs, profession, contentType, sortBy, search]);

  const handleContentTypeChange = useCallback((cType: string) => {
    setContentType(cType);
    setCurrentPage(1);
    loadCelebs(profession, nationality, cType, sortBy, 1, search);
  }, [loadCelebs, profession, nationality, sortBy, search]);

  const handleSortChange = useCallback((sort: CelebSortBy) => {
    setSortBy(sort);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, sort, 1, search);
  }, [loadCelebs, profession, nationality, contentType, search]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    loadCelebs(profession, nationality, contentType, sortBy, page, appliedSearch);
  }, [loadCelebs, profession, nationality, contentType, sortBy, appliedSearch]);

  // 검색어 입력 (UI만 업데이트, API 호출 안 함)
  const handleSearchInput = useCallback((term: string) => {
    setSearch(term);
  }, []);

  // 검색 실행 (버튼 클릭 또는 엔터)
  const handleSearchSubmit = useCallback(() => {
    setAppliedSearch(search);
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, sortBy, 1, search);
  }, [loadCelebs, profession, nationality, contentType, sortBy, search]);

  // 검색 초기화
  const handleSearchClear = useCallback(() => {
    setSearch("");
    setAppliedSearch("");
    setCurrentPage(1);
    loadCelebs(profession, nationality, contentType, sortBy, 1, "");
  }, [loadCelebs, profession, nationality, contentType, sortBy]);

  // 현재 선택된 값들의 라벨
  const activeLabels = useMemo(() => ({
    profession: CELEB_PROFESSION_FILTERS.find((f) => f.value === profession),
    nationality: nationalityCounts.find((n) => n.value === nationality),
    contentType: CONTENT_TYPE_FILTERS.find((c) => c.value === contentType),
    sort: SORT_OPTIONS.find((s) => s.value === sortBy),
  }), [profession, nationality, contentType, sortBy, nationalityCounts]);

  return {
    celebs,
    isLoading,
    profession,
    nationality,
    contentType,
    sortBy,
    search,
    contentUnit,
    activeFilter,
    setActiveFilter,
    activeLabels,
    professionCounts,
    nationalityCounts,
    contentTypeCounts,
    currentPage,
    totalPages,
    total,
    handleProfessionChange,
    handleNationalityChange,
    handleContentTypeChange,
    handleSortChange,
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
