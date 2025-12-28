"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import { getMyContents, getMyContentsAll, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getFolders } from "@/actions/folders/getFolders";
import { moveToFolder } from "@/actions/folders/moveToFolder";
import { updateProgress } from "@/actions/contents/updateProgress";
import { updateStatus } from "@/actions/contents/updateStatus";
import { removeContent } from "@/actions/contents/removeContent";
import type { ContentType, ContentStatus, FolderWithCount } from "@/types/database";

export type ViewMode = "grid" | "list";
export type ProgressFilter = "all" | "not_started" | "in_progress" | "completed";
export type SortOption = "recent" | "title" | "progress_asc" | "progress_desc";

interface UseContentLibraryOptions {
  maxItems?: number;
  compact?: boolean;
  showFolders?: boolean;
}

export function useContentLibrary(options: UseContentLibraryOptions = {}) {
  const { maxItems, compact = false, showFolders = true } = options;

  const [activeTab, setActiveTab] = useState("all");
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

  const [collapsedCategories, setCollapsedCategories] = useState<Set<ContentType>>(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");

  const toggleCategory = useCallback((type: ContentType) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
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
    setCollapsedCategories(new Set());
    setCollapsedFolders(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    const allTypes: ContentType[] = ["BOOK", "VIDEO", "GAME", "MUSIC", "CERTIFICATE"];
    setCollapsedCategories(new Set(allTypes));
  }, []);

  const isAllCollapsed = useMemo(() => {
    const allTypes: ContentType[] = ["BOOK", "VIDEO", "GAME", "MUSIC", "CERTIFICATE"];
    return allTypes.every((type) => collapsedCategories.has(type));
  }, [collapsedCategories]);

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
      if (activeTab === "all") {
        const items = await getMyContentsAll();
        setContents(items);
        setTotalPages(1);
        setTotal(items.length);
      } else {
        const typeMap: Record<string, ContentType> = {
          book: "BOOK", video: "VIDEO", game: "GAME", music: "MUSIC", certificate: "CERTIFICATE",
        };
        const limit = maxItems || 20;
        const result = await getMyContents({
          type: typeMap[activeTab],
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
  }, [activeTab, currentPage, maxItems, compact]);

  useEffect(() => {
    loadContents();
    if (showFolders) loadFolders();
  }, [loadContents, loadFolders, showFolders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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

  return {
    // State
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
    collapsedCategories,
    collapsedFolders,
    progressFilter, setProgressFilter,
    sortOption, setSortOption,
    isAllCollapsed,
    // Actions
    toggleCategory,
    toggleFolder,
    expandAll,
    collapseAll,
    loadContents,
    loadFolders,
    handleProgressChange,
    handleStatusChange,
    handleDelete,
    handleMoveToFolder,
  };
}
