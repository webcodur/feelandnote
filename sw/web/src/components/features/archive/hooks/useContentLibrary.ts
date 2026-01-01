/*
  파일명: /components/features/archive/hooks/useContentLibrary.ts
  기능: 콘텐츠 라이브러리 상태 및 로직 관리 훅
  책임: 콘텐츠 CRUD, 필터링, 정렬, 폴더 관리를 처리한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";

import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getFolders } from "@/actions/folders/getFolders";
import { moveToFolder } from "@/actions/folders/moveToFolder";
import { updateProgress } from "@/actions/contents/updateProgress";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateRecommendation } from "@/actions/contents/updateRecommendation";
import { updateDate } from "@/actions/contents/updateDate";
import { removeContent } from "@/actions/contents/removeContent";

import type { ContentType, ContentStatus, FolderWithCount } from "@/types/database";

// #region 타입
export type ViewMode = "grid" | "list";
export type ProgressFilter = "all" | "not_started" | "in_progress" | "completed";
export type SortOption = "recent" | "title" | "progress_asc" | "progress_desc";

interface UseContentLibraryOptions {
  maxItems?: number;
  compact?: boolean;
  showFolders?: boolean;
}

export interface GroupedContents {
  uncategorized: UserContentWithContent[];
  byFolder: Record<string, UserContentWithContent[]>;
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
  const { maxItems, compact = false, showFolders = true } = options;

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

  const [folders, setFolders] = useState<Record<ContentType, FolderWithCount[]>>({
    BOOK: [], VIDEO: [], GAME: [], MUSIC: [], CERTIFICATE: [],
  });
  const [folderManagerType, setFolderManagerType] = useState<ContentType | null>(null);

  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  // #endregion

  // #region 파생 상태 (useMemo)
  const filteredAndSortedContents = useMemo(() => {
    let result = [...contents];

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
  }, [contents, progressFilter, sortOption]);

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

  const groupedByFolder = useMemo(() => {
    const result: GroupedContents = { uncategorized: [], byFolder: {} };
    filteredAndSortedContents.forEach((item) => {
      if (item.folder_id) {
        if (!result.byFolder[item.folder_id]) result.byFolder[item.folder_id] = [];
        result.byFolder[item.folder_id].push(item);
      } else {
        result.uncategorized.push(item);
      }
    });
    return result;
  }, [filteredAndSortedContents]);

  const currentCategoryFolders = useMemo(() => {
    const type = TYPE_MAP[activeTab];
    return type ? folders[type] || [] : [];
  }, [activeTab, folders]);
  // #endregion

  // #region 헬퍼 함수
  const getFolderName = useCallback((folderId: string, contentType: ContentType) => {
    return folders[contentType]?.find((f) => f.id === folderId)?.name || "알 수 없는 폴더";
  }, [folders]);

  // 월 키("2024-01")를 "2024년 1월" 형태로 변환
  const formatMonthLabel = useCallback((monthKey: string) => {
    const [year, month] = monthKey.split("-");
    return `${year}년 ${parseInt(month)}월`;
  }, []);
  // #endregion

  // #region 월/폴더 토글
  const toggleMonth = useCallback((monthKey: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);

  const toggleFolder = useCallback((folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedMonths(new Set());
    setCollapsedFolders(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedMonths(new Set(monthKeys));
  }, [monthKeys]);
  // #endregion

  // #region 데이터 로딩
  const loadFolders = useCallback(async () => {
    try {
      const allFolders = await getFolders();
      const grouped: Record<ContentType, FolderWithCount[]> = {
        BOOK: [], VIDEO: [], GAME: [], MUSIC: [], CERTIFICATE: [],
      };
      allFolders.forEach((folder) => {
        if (grouped[folder.content_type as ContentType]) {
          grouped[folder.content_type as ContentType].push(folder);
        }
      });
      setFolders(grouped);
    } catch (err) {
      console.error("폴더 로드 실패:", err);
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
    if (showFolders) loadFolders();
  }, [loadContents, loadFolders, showFolders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);
  // #endregion

  // #region 핸들러
  const handleProgressChange = useCallback((userContentId: string, progress: number) => {
    setContents((prev) =>
      prev.map((item) => {
        if (item.id !== userContentId) return item;
        let newStatus = item.status;
        if (progress === 100) newStatus = "COMPLETE";
        else if (progress < 100 && item.status === "COMPLETE") newStatus = "EXPERIENCE";
        else if (progress > 0 && item.status === "WISH") newStatus = "EXPERIENCE";
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

  const handleMoveToFolder = useCallback(async (userContentId: string, folderId: string | null) => {
    setContents((prev) =>
      prev.map((item) => (item.id === userContentId ? { ...item, folder_id: folderId } : item))
    );
    try {
      await moveToFolder({ userContentIds: [userContentId], folderId });
      loadFolders();
    } catch (err) {
      loadContents();
      console.error("폴더 이동 실패:", err);
    }
  }, [loadContents, loadFolders]);

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
    folders,
    folderManagerType, setFolderManagerType,
    collapsedMonths,
    collapsedFolders,
    progressFilter, setProgressFilter,
    sortOption, setSortOption,
    // 파생 상태
    isAllCollapsed,
    filteredAndSortedContents,
    groupedByMonth,
    monthKeys,
    groupedByFolder,
    currentCategoryFolders,
    // 헬퍼
    getFolderName,
    formatMonthLabel,
    // 액션
    toggleMonth,
    toggleFolder,
    expandAll,
    collapseAll,
    loadContents,
    loadFolders,
    handleProgressChange,
    handleStatusChange,
    handleRecommendChange,
    handleDateChange,
    handleDelete,
    handleMoveToFolder,
  };
}
