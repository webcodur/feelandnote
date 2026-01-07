/*
  파일명: /components/features/archive/hooks/useContentLibrary.ts
  기능: 콘텐츠 라이브러리 상태 및 로직 관리 훅
  책임: 콘텐츠 CRUD, 필터링, 정렬, 분류 관리를 처리한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";

import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getContentCounts, type ContentTypeCounts } from "@/actions/contents/getContentCounts";
import { getCategories } from "@/actions/categories/getCategories";
import { moveToCategory } from "@/actions/categories/moveToCategory";
import { updateProgress } from "@/actions/contents/updateProgress";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateRecommendation } from "@/actions/contents/updateRecommendation";
import { updateDate } from "@/actions/contents/updateDate";
import { removeContent } from "@/actions/contents/removeContent";
import { togglePin } from "@/actions/contents/togglePin";

import type { ContentType, ContentStatus, CategoryWithCount } from "@/types/database";

// #region 타입
export type ViewMode = "grid" | "list";
export type ProgressFilter = "all" | "not_started" | "in_progress" | "completed";
export type SortOption = "recent" | "title" | "progress_asc" | "progress_desc";

interface UseContentLibraryOptions {
  maxItems?: number;
  compact?: boolean;
  showCategories?: boolean;
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

// #region 상수
const CONTENT_TYPES: ContentType[] = ["BOOK", "VIDEO", "GAME", "MUSIC", "CERTIFICATE"];

const TYPE_MAP: Record<string, ContentType> = {
  book: "BOOK",
  video: "VIDEO",
  game: "GAME",
  music: "MUSIC",
  certificate: "CERTIFICATE",
};
// #endregion

export function useContentLibrary(options: UseContentLibraryOptions = {}) {
  const { maxItems, compact = false, showCategories = true } = options;

  // #region 상태
  const [activeTab, setActiveTab] = useState("book");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
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

  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // null = 전체

  // 배치 모드 상태
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 핀 모드 상태
  const [isPinMode, setIsPinMode] = useState(false);
  // #endregion

  // #region 파생 상태 (useMemo)
  const filteredAndSortedContents = useMemo(() => {
    let result = [...contents];

    // 분류 필터링
    if (selectedCategoryId !== null) {
      result = result.filter((item) => item.category_id === selectedCategoryId);
    }

    if (progressFilter !== "all") {
      result = result.filter((item) => {
        const progress = item.progress ?? 0;
        switch (progressFilter) {
          case "not_started": return progress === 0;
          case "in_progress": return progress > 0 && progress < 100;
          case "completed": return progress === 100;
          default: return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case "title": return (a.content?.title ?? "").localeCompare(b.content?.title ?? "");
        case "progress_asc": return (a.progress ?? 0) - (b.progress ?? 0);
        case "progress_desc": return (b.progress ?? 0) - (a.progress ?? 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [contents, selectedCategoryId, progressFilter, sortOption]);

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
    const type = TYPE_MAP[activeTab];
    return type ? categories[type] || [] : [];
  }, [activeTab, categories]);

  // 핀된 콘텐츠 (pinned_at 기준 최신순 정렬)
  const pinnedContents = useMemo(() => {
    return contents
      .filter((item) => item.is_pinned)
      .sort((a, b) => {
        const aTime = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
        const bTime = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [contents]);

  const pinnedCount = pinnedContents.length;
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

  // 배치 모드 토글
  const toggleBatchMode = useCallback(() => {
    setIsBatchMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  // 개별 선택 토글
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 전체 선택
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredAndSortedContents.map(c => c.id)));
  }, [filteredAndSortedContents]);

  // 전체 해제
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 핀 모드 진입/종료
  const enterPinMode = useCallback(() => {
    setIsPinMode(true);
    setIsBatchMode(false); // 배치 모드 해제
    setSelectedIds(new Set());
  }, []);

  const exitPinMode = useCallback(() => {
    setIsPinMode(false);
  }, []);

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
      const counts = await getContentCounts();
      setTypeCounts(counts);
    } catch (err) {
      console.error("타입별 개수 로드 실패:", err);
    }
  }, []);

  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const limit = maxItems || 20;
      const result = await getMyContents({
        type: TYPE_MAP[activeTab],
        page: compact ? 1 : currentPage,
        limit,
      });
      setContents(result.items);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, maxItems, compact]);

  useEffect(() => {
    loadContents();
    loadTypeCounts();
    if (showCategories) loadCategories();
  }, [loadContents, loadCategories, loadTypeCounts, showCategories]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategoryId(null); // 탭 변경 시 분류 선택 초기화
  }, [activeTab]);
  // #endregion

  // #region 핸들러
  // 핀 토글 핸들러
  const handlePinToggle = useCallback((userContentId: string) => {
    const item = contents.find((c) => c.id === userContentId);
    if (!item) return;

    const newPinned = !item.is_pinned;

    // 핀 추가 시 10개 제한 체크
    if (newPinned && pinnedCount >= 10) {
      alert("최대 10개까지 고정할 수 있습니다");
      return;
    }

    // 낙관적 업데이트
    setContents((prev) =>
      prev.map((c) =>
        c.id === userContentId
          ? { ...c, is_pinned: newPinned, pinned_at: newPinned ? new Date().toISOString() : null }
          : c
      )
    );

    // 서버 동기화
    startTransition(async () => {
      try {
        const result = await togglePin({ userContentId, isPinned: newPinned });
        if (!result.success) {
          loadContents();
          if (result.error === "MAX_PINNED_EXCEEDED") {
            alert("최대 10개까지 고정할 수 있습니다");
          }
        }
      } catch (err) {
        loadContents();
        console.error("핀 상태 변경 실패:", err);
      }
    });
  }, [contents, pinnedCount, loadContents]);

  const handleProgressChange = useCallback((userContentId: string, progress: number) => {
    setContents((prev) =>
      prev.map((item) => {
        if (item.id !== userContentId) return item;
        let newStatus = item.status;
        if (progress === 100) newStatus = "FINISHED";
        else if (progress < 100 && item.status === "FINISHED") newStatus = "WATCHING";
        else if (progress > 0 && item.status === "WANT") newStatus = "WATCHING";
        return { ...item, progress, status: newStatus };
      })
    );
    startTransition(async () => {
      try {
        await updateProgress({ userContentId, progress });
      } catch (err) {
        loadContents();
        console.error("진행도 업데이트 실패:", err);
      }
    });
  }, [loadContents]);

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

  const handleDelete = useCallback((userContentId: string) => {
    setContents((prev) => prev.filter((item) => item.id !== userContentId));
    startTransition(async () => {
      try {
        await removeContent(userContentId);
      } catch (err) {
        loadContents();
        console.error("삭제 실패:", err);
      }
    });
  }, [loadContents]);

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
  // #endregion

  return {
    // 기본 상태
    activeTab, setActiveTab,
    viewMode, setViewMode,
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
    progressFilter, setProgressFilter,
    sortOption, setSortOption,
    selectedCategoryId, setSelectedCategoryId,
    // 배치 모드
    isBatchMode,
    selectedIds,
    // 핀 모드
    isPinMode,
    pinnedContents,
    pinnedCount,
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
    toggleBatchMode,
    toggleSelect,
    selectAll,
    deselectAll,
    loadContents,
    loadCategories,
    handleProgressChange,
    handleStatusChange,
    handleRecommendChange,
    handleDateChange,
    handleDelete,
    handleMoveToCategory,
    // 핀 액션
    enterPinMode,
    exitPinMode,
    handlePinToggle,
  };
}
