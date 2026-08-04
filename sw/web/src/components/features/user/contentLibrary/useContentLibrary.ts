/*
  파일명: /components/features/user/hooks/useContentLibrary.ts
  기능: 콘텐츠 라이브러리 상태 및 로직 관리 훅
  책임: 콘텐츠 CRUD, 필터링, 정렬, 분류 관리를 처리한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback, useTransition, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";

import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getPublicViewerContents } from "@/actions/contents/getUserContents";
import { checkContentsSaved } from "@/actions/contents/getMyContentIds";
import { getContentCounts, getUserContentCounts } from "@/actions/contents/getContentCounts";
import type { ContentTypeCounts } from "@/types/content";
import { updateStatus } from "@/actions/contents/updateStatus";
import { addContent } from "@/actions/contents/addContent";
import { updateVisibility } from "@/actions/contents/updateVisibility";
import { updateDate } from "@/actions/contents/updateDate";
import { removeContent } from "@/actions/contents/removeContent";
import { getFlowsContainingContent } from "@/actions/flows";
import type { ContentStatus, VisibilityType } from "@/types/database";
import { CATEGORY_ID_TO_TYPE, type CategoryId } from "@/constants/categories";
import {
  type SortOption,
  type ReviewFilter,
  type ViewMode,
  type FlowInfo,
  type UseContentLibraryOptions,
  filterAndSortContents,
  groupByMonth,
  formatMonthLabel,
  mapPublicToUserContent,
} from "./contentLibraryTypes";

export type { SortOption, ReviewFilter, ViewMode, ContentLibraryMode } from "./contentLibraryTypes";

export function useContentLibrary(options: UseContentLibraryOptions = {}) {
  const t = useTranslations("archiveSearch");
  const { maxItems, compact = false, mode = 'owner', targetUserId, initialSearchQuery = '', defaultViewMode, defaultPageSize, initialContents } = options;
  const isViewer = mode === 'viewer';

  // 서버가 첫 화면 데이터를 내려준 경우에만 초기 상태를 채운다.
  // 이러면 첫 렌더가 스켈레톤이 아니라 목록이므로 서버 HTML에 서가 마크업이 실린다.
  // 검색어가 붙은 진입(?q=)은 서버 데이터가 그 조건으로 조회된 게 아니므로 seed 대상에서 제외한다.
  const seed = isViewer && targetUserId && initialContents && initialSearchQuery.trim().length < 2
    ? {
        contents: mapPublicToUserContent(initialContents.items, targetUserId),
        totalPages: initialContents.totalPages,
        total: initialContents.total,
      }
    : null;

  // #region 상태
  const [activeTab, setActiveTab] = useState<CategoryId>("all");
  const [contents, setContents] = useState<UserContentWithContent[]>(seed?.contents ?? []);
  const [isLoading, setIsLoading] = useState(!seed);
  /** 이미 목록을 한 번 그린 뒤의 재조회. 목록을 지우지 않고 흐리게만 둔다. */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef(seed !== null);
  /** 연속 필터·페이지 요청이 엇갈려 도착해도 마지막 요청만 화면에 반영한다. */
  const loadRequestIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(seed?.totalPages ?? 1);
  const [total, setTotal] = useState(seed?.total ?? 0);
  const [pageSize, setPageSize] = useState(defaultPageSize ?? 10);

  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode ?? "grid");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(initialSearchQuery);

  const [typeCounts, setTypeCounts] = useState<ContentTypeCounts>({
    BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0,
  });

  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  // 타인 콘텐츠 보유 체크 (뷰어 모드용)
  // null = 비로그인, Set = 로그인 (보유 콘텐츠 ID 집합)
  const [savedContentIds, setSavedContentIds] = useState<Set<string> | null>(null);

  // 개별 삭제 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; contentId: string } | null>(null);
  const [deleteAffectedFlows, setDeleteAffectedFlows] = useState<FlowInfo[]>([]);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  // #endregion

  // #region 파생 상태 (useMemo)
  const filteredAndSortedContents = useMemo(
    () => filterAndSortContents(contents, sortOption),
    [contents, sortOption]
  );

  const groupedByMonthData = useMemo(() => groupByMonth(filteredAndSortedContents), [filteredAndSortedContents]);
  const monthKeys = useMemo(() => Object.keys(groupedByMonthData), [groupedByMonthData]);
  const isAllCollapsed = useMemo(() => monthKeys.length > 0 && monthKeys.every((key) => collapsedMonths.has(key)), [monthKeys, collapsedMonths]);

  // #endregion


  // #region 월/분류 토글
  const toggleMonth = useCallback((monthKey: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedMonths(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedMonths(new Set(monthKeys));
  }, [monthKeys]);

  const executeSearch = useCallback(() => {
    setAppliedSearchQuery(searchQuery);
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setAppliedSearchQuery("");
  }, []);

  const applySearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setAppliedSearchQuery(query);
  }, []);
  // #endregion

  // #region 데이터 로딩

  const loadTypeCounts = useCallback(async () => {
    try {
      const counts = isViewer && targetUserId
        ? await getUserContentCounts(targetUserId)
        : await getContentCounts();
      setTypeCounts(counts);
    } catch (err) {
      console.error("타입별 개수 로드 실패:", err);
    }
  }, [isViewer, targetUserId]);

  const loadContents = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    /* 첫 조회에만 목록 자리를 통째로 로딩 화면에 내준다. 페이지를 넘기거나 조건을
       바꿀 때까지 그러면 목록·조작 줄·쪽 번호가 한꺼번에 사라졌다 돌아오면서
       화면 높이가 접혔다 펴져 크게 들썩인다. 재조회는 기존 목록을 유지한다. */
    if (hasLoadedRef.current) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const limit = maxItems || pageSize;
      const searchParam = appliedSearchQuery.trim().length >= 2 ? appliedSearchQuery.trim() : undefined;
      const hasReviewParam = reviewFilter === 'has_review' ? true : reviewFilter === 'no_review' ? false : undefined;
      // 서버 정렬 가능: recent, rating_desc, rating_asc. 나머지는 recent로 보내고 클라이언트에서 정렬
      const serverSortable = ['recent', 'rating_desc', 'rating_asc'] as const;
      const sortByParam = (serverSortable as readonly string[]).includes(sortOption)
        ? (sortOption as 'recent' | 'rating_desc' | 'rating_asc')
        : 'recent';

      if (isViewer && targetUserId) {
        // viewer 모드: 타인의 공개 콘텐츠 조회
        const result = await getPublicViewerContents({
          userId: targetUserId,
          type: CATEGORY_ID_TO_TYPE[activeTab],
          // status 제거: 모든 상태 조회
          page: compact ? 1 : currentPage,
          limit,
          search: searchParam,
          hasReview: hasReviewParam,
          sortBy: sortByParam,
        });
        if (requestId !== loadRequestIdRef.current) return;
        setContents(mapPublicToUserContent(result.items, targetUserId));
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } else {
        // owner 모드: 내 콘텐츠 조회 (WANT 상태 제외 - 관심 탭으로 분리됨)
        const result = await getMyContents({
          type: CATEGORY_ID_TO_TYPE[activeTab],
          // status 제거: 모든 상태 조회
          page: compact ? 1 : currentPage,
          limit,
          search: searchParam,
          hasReview: hasReviewParam,
          sortBy: sortByParam,
        });
        if (requestId !== loadRequestIdRef.current) return;
        setContents(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error("콘텐츠 로드 실패:", err);
      setError(t("loadFailed"));
    } finally {
      if (requestId === loadRequestIdRef.current) {
        hasLoadedRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [activeTab, currentPage, maxItems, pageSize, compact, isViewer, targetUserId, appliedSearchQuery, reviewFilter, sortOption, t]);

  // 서버 초기 데이터와 같은 조건인 동안은 effect가 개발 모드에서 두 번 실행돼도 재조회하지 않는다.
  // 사용자가 조건을 한 번 바꾸면 이후 기본 조건으로 돌아왔을 때도 정상 재조회한다.
  const hasSeedForInitialQueryRef = useRef(seed !== null);
  const isInitialSeedQuery =
    activeTab === "all"
    && currentPage === 1
    && pageSize === (defaultPageSize ?? 10)
    && appliedSearchQuery.trim().length < 2
    && reviewFilter === "all"
    && sortOption === "recent";

  useEffect(() => {
    if (hasSeedForInitialQueryRef.current && isInitialSeedQuery) {
      return;
    }
    hasSeedForInitialQueryRef.current = false;
    void loadContents();
  }, [isInitialSeedQuery, loadContents]);

  useEffect(() => {
    void loadTypeCounts();
  }, [loadTypeCounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, appliedSearchQuery, pageSize, reviewFilter, sortOption]);

  // 뷰어 모드: 콘텐츠 로드 후 보유 여부 배치 체크
  useEffect(() => {
    if (!isViewer || contents.length === 0) {
      setSavedContentIds(null);
      return;
    }
    checkContentsSaved(contents.map(c => c.content_id)).then(setSavedContentIds);
  }, [isViewer, contents]);
  // #endregion

  // #region 핸들러
  const handleStatusChange = useCallback((userContentId: string, status: ContentStatus) => {
    setContents((prev) =>
      prev.map((item) => (item.id === userContentId ? { ...item, status } : item))
    );
    startTransition(async () => {
      try {
        await updateStatus({ userContentId, status });
      } catch (err) {
        loadContents();
        console.error("상태 업데이트 실패:", err);
      }
    });
  }, [loadContents]);

  // 삭제 모달 열기
  const openDeleteModal = useCallback(async (userContentId: string) => {
    const item = contents.find((c) => c.id === userContentId);
    if (!item) return;

    setDeleteTarget({ id: userContentId, contentId: item.content_id });
    const flows = await getFlowsContainingContent(item.content_id);
    setDeleteAffectedFlows(flows);
  }, [contents]);

  // 삭제 모달 닫기
  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null);
    setDeleteAffectedFlows([]);
  }, []);

  // 실제 삭제 실행
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleteLoading(true);
    setContents((prev) => prev.filter((item) => item.id !== deleteTarget.id));

    try {
      await removeContent(deleteTarget.id);
      closeDeleteModal();
    } catch (err) {
      loadContents();
      console.error("삭제 실패:", err);
    } finally {
      setIsDeleteLoading(false);
    }
  }, [deleteTarget, loadContents, closeDeleteModal]);

  // 기존 handleDelete는 모달을 여는 것으로 변경
  const handleDelete = openDeleteModal;

  const handleDateChange = useCallback((userContentId: string, field: "created_at" | "completed_at", date: string) => {
    setContents((prev) =>
      prev.map((item) => (item.id === userContentId ? { ...item, [field]: date } : item))
    );
    startTransition(async () => {
      try {
        await updateDate({ userContentId, field, date });
      } catch (err) {
        loadContents();
        console.error("날짜 업데이트 실패:", err);
      }
    });
  }, [loadContents]);

  const handleVisibilityChange = useCallback((userContentId: string, visibility: VisibilityType) => {
    setContents((prev) =>
      prev.map((item) => (item.id === userContentId ? { ...item, visibility } : item))
    );
    startTransition(async () => {
      try {
        await updateVisibility({ userContentId, visibility });
      } catch (err) {
        loadContents();
        console.error("공개 설정 업데이트 실패:", err);
      }
    });
  }, [loadContents]);

  // 뷰어 모드: 콘텐츠 WANT 등록 (addable 클릭)
  const handleAddContent = useCallback(async (contentId: string) => {
    const item = contents.find(c => c.content_id === contentId);
    if (!item) return;
    const result = await addContent({
      id: item.content_id,
      type: item.content.type,
      title: item.content.title,
      creator: item.content.creator ?? undefined,
      thumbnailUrl: item.content.thumbnail_url ?? undefined,
      // status 제거 (addContent에서 처리)
    });
    if (result.success) {
      setSavedContentIds(prev => {
        const next = new Set(prev ?? []);
        next.add(contentId);
        return next;
      });
    }
  }, [contents]);
  // #endregion

  return {
    // 모드
    isViewer,
    savedContentIds,
    // 기본 상태
    activeTab, setActiveTab,
    contents,
    isLoading,
    isRefreshing,
    error,
    currentPage, setCurrentPage,
    totalPages,
    total,
    pageSize, setPageSize,
    typeCounts,
    collapsedMonths,
    sortOption, setSortOption,
    reviewFilter, setReviewFilter,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    appliedSearchQuery,
    executeSearch, clearSearch, applySearchQuery,
    formatMonthLabel,
    // 파생 상태
    filteredAndSortedContents,
    groupedByMonth: groupedByMonthData,
    monthKeys,
    isAllCollapsed,
    // 액션
    toggleMonth,
    expandAll,
    collapseAll,
    loadContents,
    handleStatusChange,
    handleAddContent,
    handleDateChange,
    handleVisibilityChange,
    handleDelete,
    // 개별 삭제 모달
    isDeleteModalOpen: deleteTarget !== null,
    deleteAffectedFlows,
    isDeleteLoading,
    closeDeleteModal,
    confirmDelete,
  };
}
