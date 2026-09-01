/* 콘텐츠 라이브러리의 화면 상태와 파생 목록을 조합한다. */
"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import { addContent } from "@/actions/contents/addContent";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { CategoryId } from "@/constants/categories";

import {
  filterAndSortContents,
  formatMonthLabel,
  groupByMonth,
  mapPublicToUserContent,
  type ReviewFilter,
  type SortOption,
  type UseContentLibraryOptions,
  type ViewMode,
} from "./contentLibraryTypes";
import { useContentLibraryData } from "./useContentLibraryData";
import { useContentLibraryDelete } from "./useContentLibraryDelete";
import { useDesktopLayout } from "./useDesktopLayout";

export type { ContentLibraryMode, ReviewFilter, SortOption, ViewMode } from "./contentLibraryTypes";

const EMPTY_CONTENTS: UserContentWithContent[] = [];

export function useContentLibrary(options: UseContentLibraryOptions = {}) {
  const locale = useLocale();
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
    initialContentBrief,
  } = options;
  const isViewer = mode === "viewer";
  const initialContentRecord = useMemo(() => {
    if (ownerKind !== "celeb" || !targetUserId || !initialContents?.items[0]) return undefined;
    return mapPublicToUserContent([initialContents.items[0]], targetUserId)[0];
  }, [initialContents, ownerKind, targetUserId]);

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
    pickedViewMode ?? (isDesktop === true && desktopViewMode ? desktopViewMode : defaultViewMode ?? "list");
  const hasResponsiveDefaultView =
    pickedViewMode === null
    && desktopViewMode !== undefined
    && desktopViewMode !== (defaultViewMode ?? "list");

  const data = useContentLibraryData({
    activeTab,
    appliedSearchQuery,
    compact,
    currentPage,
    defaultPageSize: defaultPageSize ?? 10,
    initialContents,
    initialSearchQuery,
    isViewer,
    isResponsiveViewPending: hasResponsiveDefaultView && isDesktop === null,
    maxItems,
    ownerKind,
    pageSize,
    reviewFilter,
    sortOption,
    targetUserId,
    viewMode,
  });

  const filteredAndSortedContents = useMemo(
    () => filterAndSortContents(
      data.contents,
      sortOption,
      ownerKind === "celeb" && locale === "ko",
    ),
    [data.contents, locale, ownerKind, sortOption],
  );
  const cachedListContents = data.getCachedContents("list")
    ?? (viewMode === "list" ? data.contents : EMPTY_CONTENTS);
  const cachedExpandContents = data.getCachedContents("expand")
    ?? (viewMode === "expand" ? data.contents : EMPTY_CONTENTS);
  const listContents = useMemo(
    () => filterAndSortContents(
      cachedListContents,
      sortOption,
      ownerKind === "celeb" && locale === "ko",
    ),
    [cachedListContents, locale, ownerKind, sortOption],
  );
  const expandContents = useMemo(
    () => filterAndSortContents(
      cachedExpandContents,
      sortOption,
      ownerKind === "celeb" && locale === "ko",
    ),
    [cachedExpandContents, locale, ownerKind, sortOption],
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
  const currentContents = data.contents;
  const setSavedContentIds = data.setSavedContentIds;

  const handleAddContent = useCallback(async (contentId: string) => {
    const item = currentContents.find((content) => content.content_id === contentId);
    if (!item) return;
    const result = await addContent({
      id: item.content_id,
      type: item.content.type,
      title: item.content.title,
      creator: item.content.creator ?? undefined,
      thumbnailUrl: item.content.thumbnail_url ?? undefined,
    });
    if (result.success) {
      setSavedContentIds((previous) => new Set([...(previous ?? []), contentId]));
    }
  }, [currentContents, setSavedContentIds]);

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
    isDesktop,
    hasResponsiveDefaultView,
    isResolvingResponsiveView: hasResponsiveDefaultView && isDesktop === null,
    responsiveDefaultViewMode: defaultViewMode ?? "list",
    responsiveDesktopViewMode: desktopViewMode,
    initialContentBrief,
    initialContentRecord,
    searchQuery,
    setSearchQuery,
    appliedSearchQuery,
    executeSearch,
    clearSearch,
    applySearchQuery,
    collapsedMonths,
    filteredAndSortedContents,
    contentsByView: { list: listContents, expand: expandContents },
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
