/*
  파일명: /components/features/archive/hooks/useContentLibrary.ts
  기능: 콘텐츠 라이브러리 상태 및 로직 관리 훅
  책임: 콘텐츠 CRUD, 필터링, 정렬, 분류 관리를 처리한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";

import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getUserContents } from "@/actions/contents/getUserContents";
import { getContentCounts, getUserContentCounts } from "@/actions/contents/getContentCounts";
import type { ContentTypeCounts } from "@/types/content";
import { getCategories } from "@/actions/categories/getCategories";
import { moveToCategory } from "@/actions/categories/moveToCategory";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateRecommendation } from "@/actions/contents/updateRecommendation";
import { updateVisibility } from "@/actions/contents/updateVisibility";
import { updateDate } from "@/actions/contents/updateDate";
import { removeContent } from "@/actions/contents/removeContent";
import { getPlaylistsContainingContent } from "@/actions/playlists";

interface PlaylistInfo {
  id: string;
  name: string;
}

import type { ContentType, ContentStatus, CategoryWithCount, VisibilityType } from "@/types/database";
import { CATEGORY_ID_TO_TYPE, type CategoryId } from "@/constants/categories";

// #region 타입
export type SortOption = "recent" | "title";
export type StatusFilter = "all" | ContentStatus;

export type ContentLibraryMode = 'owner' | 'viewer';

interface UseContentLibraryOptions {
  maxItems?: number;
  compact?: boolean;
  showCategories?: boolean;
  mode?: ContentLibraryMode;
  targetUserId?: string; // viewer 모드에서 필수
}

export interface GroupedContents {
  uncategorized: UserContentWithContent[];
  byCategory: Record<string, UserContentWithContent[]>;
}

export interface TabOption {
  value: string;
  label: string;
  type?: ContentType;
}
// #endregion

export function useContentLibrary(options: UseContentLibraryOptions = {}) {
  const { maxItems, compact = false, showCategories = true, mode = 'owner', targetUserId } = options;
  const isViewer = mode === 'viewer';

  // #region 상태
  const [activeTab, setActiveTab] = useState<CategoryId>("book");
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [categories, setCategories] = useState<Record<ContentType, CategoryWithCount[]>>({
    BOOK: [], VIDEO: [], GAME: [], MUSIC: [], CERTIFICATE: [],
  });
  const [typeCounts, setTypeCounts] = useState<ContentTypeCounts>({
    BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0,
  });
  const [categoryManagerType, setCategoryManagerType] = useState<ContentType | null>(null);

  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // null = 전체

  // 개별 삭제 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; contentId: string } | null>(null);
  const [deleteAffectedPlaylists, setDeleteAffectedPlaylists] = useState<PlaylistInfo[]>([]);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  // #endregion

  // #region 파생 상태 (useMemo)
  const filteredAndSortedContents = useMemo(() => {
    let result = [...contents];

    // 상태 필터링
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    // 분류 필터링
    if (selectedCategoryId !== null) {
      result = result.filter((item) => item.category_id === selectedCategoryId);
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case "title": return (a.content?.title ?? "").localeCompare(b.content?.title ?? "");
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [contents, statusFilter, selectedCategoryId, sortOption]);

  // 월별 그룹화: "2024-01" 형태의 키로 그룹화
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, UserContentWithContent[]> = {};

    filteredAndSortedContents.forEach((item) => {
      const date = new Date(item.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });

    // 최신 월부터 정렬
    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
    );
  }, [filteredAndSortedContents]);

  const monthKeys = useMemo(() => Object.keys(groupedByMonth), [groupedByMonth]);

  const isAllCollapsed = useMemo(() => {
    return monthKeys.length > 0 && monthKeys.every((key) => collapsedMonths.has(key));
  }, [monthKeys, collapsedMonths]);

  const groupedByCategory = useMemo(() => {
    const result: GroupedContents = { uncategorized: [], byCategory: {} };
    filteredAndSortedContents.forEach((item) => {
      if (item.category_id) {
        if (!result.byCategory[item.category_id]) result.byCategory[item.category_id] = [];
        result.byCategory[item.category_id].push(item);
      } else {
        result.uncategorized.push(item);
      }
    });
    return result;
  }, [filteredAndSortedContents]);

  const currentTypeCategories = useMemo(() => {
    const type = CATEGORY_ID_TO_TYPE[activeTab];
    return type ? categories[type] || [] : [];
  }, [activeTab, categories]);
  // #endregion

  // #region 헬퍼 함수
  const getCategoryName = useCallback((categoryId: string, contentType: ContentType) => {
    return categories[contentType]?.find((c) => c.id === categoryId)?.name || "알 수 없는 분류";
  }, [categories]);

  // 월 키("2024-01")를 "2024년 1월" 형태로 변환
  const formatMonthLabel = useCallback((monthKey: string) => {
    const [year, month] = monthKey.split("-");
    return `${year}년 ${parseInt(month)}월`;
  }, []);
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

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedMonths(new Set());
    setCollapsedCategories(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedMonths(new Set(monthKeys));
  }, [monthKeys]);
  // #endregion

  // #region 데이터 로딩
  const loadCategories = useCallback(async () => {
    try {
      const allCategories = await getCategories();
      const grouped: Record<ContentType, CategoryWithCount[]> = {
        BOOK: [], VIDEO: [], GAME: [], MUSIC: [], CERTIFICATE: [],
      };
      allCategories.forEach((category) => {
        if (grouped[category.content_type as ContentType]) {
          grouped[category.content_type as ContentType].push(category);
        }
      });
      setCategories(grouped);
    } catch (err) {
      console.error("분류 로드 실패:", err);
    }
  }, []);

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
    setIsLoading(true);
    setError(null);
    try {
      const limit = maxItems || 20;

      if (isViewer && targetUserId) {
        // viewer 모드: 타인의 공개 콘텐츠 조회
        const result = await getUserContents({
          userId: targetUserId,
          type: CATEGORY_ID_TO_TYPE[activeTab],
          page: compact ? 1 : currentPage,
          limit,
        });
        // UserContentPublic을 UserContentWithContent 형태로 매핑
        const mapped: UserContentWithContent[] = result.items.map((item) => ({
          id: item.id,
          content_id: item.content_id,
          user_id: targetUserId,
          status: item.status as ContentStatus,
          visibility: item.visibility ?? 'public',
          created_at: item.created_at,
          updated_at: item.created_at, // viewer 모드에서는 created_at으로 대체
          completed_at: null,
          rating: item.public_record?.rating ?? null,
          review: item.public_record?.content_preview ?? null,
          is_recommended: false,
          is_spoiler: false, // viewer 모드에서는 스포일러 정보 없음
          category_id: null,
          is_pinned: false,
          pinned_at: null,
          content: {
            id: item.content.id,
            type: item.content.type as ContentType,
            title: item.content.title,
            creator: item.content.creator,
            thumbnail_url: item.content.thumbnail_url,
            description: null,
            publisher: null,
            release_date: null,
            metadata: item.content.metadata,
          },
        }));
        setContents(mapped);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } else {
        // owner 모드: 내 콘텐츠 조회
        const result = await getMyContents({
          type: CATEGORY_ID_TO_TYPE[activeTab],
          page: compact ? 1 : currentPage,
          limit,
        });
        setContents(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, maxItems, compact, isViewer, targetUserId]);

  useEffect(() => {
    loadContents();
    loadTypeCounts();
    if (showCategories) loadCategories();
  }, [loadContents, loadCategories, loadTypeCounts, showCategories]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategoryId(null); // 탭 변경 시 분류 선택 초기화
    setStatusFilter("all"); // 탭 변경 시 상태 필터 초기화
  }, [activeTab]);
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
    const playlists = await getPlaylistsContainingContent(item.content_id);
    setDeleteAffectedPlaylists(playlists);
  }, [contents]);

  // 삭제 모달 닫기
  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null);
    setDeleteAffectedPlaylists([]);
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

  const handleRecommendChange = useCallback((userContentId: string, isRecommended: boolean) => {
    setContents((prev) =>
      prev.map((item) => (item.id === userContentId ? { ...item, is_recommended: isRecommended } : item))
    );
    startTransition(async () => {
      try {
        await updateRecommendation({ userContentId, isRecommended });
      } catch (err) {
        loadContents();
        console.error("추천 상태 업데이트 실패:", err);
      }
    });
  }, [loadContents]);

  const handleMoveToCategory = useCallback(async (userContentId: string, categoryId: string | null) => {
    setContents((prev) =>
      prev.map((item) => (item.id === userContentId ? { ...item, category_id: categoryId } : item))
    );
    try {
      await moveToCategory({ userContentIds: [userContentId], categoryId });
      loadCategories();
    } catch (err) {
      loadContents();
      console.error("분류 이동 실패:", err);
    }
  }, [loadContents, loadCategories]);

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
  // #endregion

  return {
    // 모드
    isViewer,
    // 기본 상태
    activeTab, setActiveTab,
    contents,
    isLoading,
    error,
    currentPage, setCurrentPage,
    totalPages,
    total,
    categories,
    typeCounts,
    categoryManagerType, setCategoryManagerType,
    collapsedMonths,
    collapsedCategories,
    sortOption, setSortOption,
    statusFilter, setStatusFilter,
    selectedCategoryId, setSelectedCategoryId,
    // 파생 상태
    isAllCollapsed,
    filteredAndSortedContents,
    groupedByMonth,
    monthKeys,
    groupedByCategory,
    currentTypeCategories,
    // 헬퍼
    getCategoryName,
    formatMonthLabel,
    // 액션
    toggleMonth,
    toggleCategory,
    expandAll,
    collapseAll,
    loadContents,
    loadCategories,
    handleStatusChange,
    handleRecommendChange,
    handleDateChange,
    handleVisibilityChange,
    handleDelete,
    handleMoveToCategory,
    // 개별 삭제 모달
    isDeleteModalOpen: deleteTarget !== null,
    deleteAffectedPlaylists,
    isDeleteLoading,
    closeDeleteModal,
    confirmDelete,
  };
}
