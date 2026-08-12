/* 콘텐츠 라이브러리의 화면 상태와 파생 목록을 조합한다. */
"use client";

import { useCallback, useMemo, useState } from "react";

import { addContent } from "@/actions/contents/addContent";
import type { CategoryId } from "@/constants/categories";

import {
  filterAndSortContents,
  formatMonthLabel,
  groupByMonth,
  type ReviewFilter,
  type SortOption,
  type UseContentLibraryOptions,
  type ViewMode,
} from "./contentLibraryTypes";
import { useContentLibraryData } from "./useContentLibraryData";
import { useContentLibraryDelete } from "./useContentLibraryDelete";
import { useDesktopLayout } from "./useDesktopLayout";

export type { ContentLibraryMode, ReviewFilter, SortOption, ViewMode } from "./contentLibraryTypes";

export function useContentLibrary(options: UseContentLibraryOptions = {}) {
  const {
    maxItems,
    compact = false,
    mode = "owner",
    ownerKind = "member",
    targetUserId,
    initialSearchQuery = "",
    defaultViewMode,
    desktopViewMode,
    defaultPageSize,
    initialContents,
  } = options;
  const isViewer = mode === "viewer";

  const [activeTab, setActiveTabState] = useState<CategoryId>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize ?? 10);
  const [sortOption, setSortOptionState] = useState<SortOption>("recent");
  const [reviewFilter, setReviewFilterState] = useState<ReviewFilter>("all");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(initialSearchQuery);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const isDesktop = useDesktopLayout();
  const [pickedViewMode, setPickedViewMode] = useState<ViewMode | null>(null);
  const viewMode =
    pickedViewMode ?? (isDesktop && desktopViewMode ? desktopViewMode : defaultViewMode ?? "list");

  const data = useContentLibraryData({
    activeTab,
    appliedSearchQuery,
    compact,
    currentPage,
    defaultPageSize: defaultPageSize ?? 10,
    initialContents,
    initialSearchQuery,
    isViewer,
    maxItems,
    ownerKind,
    pageSize,
    reviewFilter,
    sortOption,
    targetUserId,
    viewMode,
  });

  const filteredAndSortedContents = useMemo(
    () => filterAndSortContents(data.contents, sortOption),
    [data.contents, sortOption],
  );
  const groupedByMonthData = useMemo(
    () => groupByMonth(filteredAndSortedContents),
    [filteredAndSortedContents],
  );
  const monthKeys = useMemo(() => Object.keys(groupedByMonthData), [groupedByMonthData]);
  const isAllCollapsed = useMemo(
    () => monthKeys.length > 0 && monthKeys.every((key) => collapsedMonths.has(key)),
    [collapsedMonths, monthKeys],
  );

  const setActiveTab = useCallback((value: CategoryId) => {
    setActiveTabState(value);
    setCurrentPage(1);
  }, []);
  const setPageSize = useCallback((value: number) => {
    setPageSizeState(value);
    setCurrentPage(1);
  }, []);
  const setSortOption = useCallback((value: SortOption) => {
    setSortOptionState(value);
    setCurrentPage(1);
  }, []);
  const setReviewFilter = useCallback((value: ReviewFilter) => {
    setReviewFilterState(value);
    setCurrentPage(1);
  }, []);
  const executeSearch = useCallback(() => {
    setAppliedSearchQuery(searchQuery);
    setCurrentPage(1);
  }, [searchQuery]);
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setAppliedSearchQuery("");
    setCurrentPage(1);
  }, []);
  const applySearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setAppliedSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const toggleMonth = useCallback((monthKey: string) => {
    setCollapsedMonths((previous) => {
      const next = new Set(previous);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);
  const expandAll = useCallback(() => setCollapsedMonths(new Set()), []);
  const collapseAll = useCallback(() => setCollapsedMonths(new Set(monthKeys)), [monthKeys]);

  const deletion = useContentLibraryDelete(data.contents, data.setContents, data.loadContents);

  const handleAddContent = useCallback(async (contentId: string) => {
    const item = data.contents.find((content) => content.content_id === contentId);
    if (!item) return;
    const result = await addContent({
      id: item.content_id,
      type: item.content.type,
      title: item.content.title,
      creator: item.content.creator ?? undefined,
      thumbnailUrl: item.content.thumbnail_url ?? undefined,
    });
    if (result.success) {
      data.setSavedContentIds((previous) => new Set([...(previous ?? []), contentId]));
    }
  }, [data]);

  return {
    isViewer,
    ...data,
    activeTab,
    setActiveTab,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortOption,
    setSortOption,
    reviewFilter,
    setReviewFilter,
    viewMode,
    setViewMode: setPickedViewMode,
    searchQuery,
    setSearchQuery,
    appliedSearchQuery,
    executeSearch,
    clearSearch,
    applySearchQuery,
    collapsedMonths,
    filteredAndSortedContents,
    groupedByMonth: groupedByMonthData,
    monthKeys,
    isAllCollapsed,
    toggleMonth,
    expandAll,
    collapseAll,
    formatMonthLabel,
    handleAddContent,
    handleDelete: deletion.openDeleteModal,
    ...deletion,
  };
}
