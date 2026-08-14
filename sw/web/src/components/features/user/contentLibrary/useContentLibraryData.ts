"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { getCelebContentCounts, getContentCounts, getUserContentCounts } from "@/actions/contents/getContentCounts";
import { checkContentsSaved } from "@/actions/contents/getMyContentIds";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import {
  getPublicCelebContents,
  getPublicViewerContents,
  type GetUserContentsResponse,
} from "@/actions/contents/getUserContents";
import { CATEGORY_ID_TO_TYPE, type CategoryId } from "@/constants/categories";
import type { ContentTypeCounts } from "@/types/content";

import { mapPublicToUserContent, type ContentOwnerKind, type ReviewFilter, type SortOption, type ViewMode } from "./contentLibraryTypes";

const EXPAND_LIMIT = 200;

interface ContentLibraryDataOptions {
  activeTab: CategoryId;
  appliedSearchQuery: string;
  compact: boolean;
  currentPage: number;
  defaultPageSize: number;
  initialContents?: GetUserContentsResponse;
  initialSearchQuery: string;
  isViewer: boolean;
  maxItems?: number;
  ownerKind: ContentOwnerKind;
  pageSize: number;
  reviewFilter: ReviewFilter;
  sortOption: SortOption;
  targetUserId?: string;
  viewMode: ViewMode;
}

interface LibrarySeed {
  contents: UserContentWithContent[];
  totalPages: number;
  total: number;
}

function createSeed(options: ContentLibraryDataOptions): LibrarySeed | null {
  const { initialContents, initialSearchQuery, isViewer, targetUserId } = options;
  if (!isViewer || !targetUserId || !initialContents || initialSearchQuery.trim().length >= 2) return null;
  return {
    contents: mapPublicToUserContent(initialContents.items, targetUserId),
    totalPages: initialContents.totalPages,
    total: initialContents.total,
  };
}

export function useContentLibraryData(options: ContentLibraryDataOptions) {
  const t = useTranslations("archiveSearch");
  const {
    activeTab,
    appliedSearchQuery,
    compact,
    currentPage,
    defaultPageSize,
    isViewer,
    maxItems,
    ownerKind,
    pageSize,
    reviewFilter,
    sortOption,
    targetUserId,
    viewMode,
  } = options;
  const seedRef = useRef<LibrarySeed | null | undefined>(undefined);
  if (seedRef.current === undefined) seedRef.current = createSeed(options);
  const seed = seedRef.current;

  const [contents, setContents] = useState<UserContentWithContent[]>(seed?.contents ?? []);
  const [isLoading, setIsLoading] = useState(!seed);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(seed?.totalPages ?? 1);
  const [total, setTotal] = useState(seed?.total ?? 0);
  const [typeCounts, setTypeCounts] = useState<ContentTypeCounts>({ BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 });
  const [savedContentIds, setSavedContentIds] = useState<Set<string> | null>(null);
  const hasLoadedRef = useRef(seed !== null);
  const loadRequestIdRef = useRef(0);
  const hasSeedForInitialQueryRef = useRef(seed !== null);

  const fetchViewerContents = ownerKind === "celeb" ? getPublicCelebContents : getPublicViewerContents;
  const loadContents = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    if (hasLoadedRef.current) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const isExpand = viewMode === "expand";
      const limit = isExpand ? EXPAND_LIMIT : maxItems || pageSize;
      const page = isExpand || compact ? 1 : currentPage;
      const search = appliedSearchQuery.trim().length >= 2
        ? appliedSearchQuery.trim()
        : undefined;
      const hasReview = reviewFilter === "all"
        ? undefined
        : reviewFilter === "has_review";
      const requestedSort = (["recent", "rating_desc", "rating_asc"] as const).includes(
        sortOption as "recent" | "rating_desc" | "rating_asc",
      ) ? sortOption as "recent" | "rating_desc" | "rating_asc" : "recent";
      const sortBy = ownerKind === "celeb" ? "recent" : requestedSort;

      if (isViewer && targetUserId) {
        const result = await fetchViewerContents({
          userId: targetUserId,
          type: CATEGORY_ID_TO_TYPE[activeTab],
          page,
          limit,
          search,
          hasReview,
          sortBy,
        });
        if (requestId !== loadRequestIdRef.current) return;
        setContents(mapPublicToUserContent(result.items, targetUserId));
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } else {
        const result = await getMyContents({
          type: CATEGORY_ID_TO_TYPE[activeTab],
          page,
          limit,
          search,
          hasReview,
          sortBy,
        });
        if (requestId !== loadRequestIdRef.current) return;
        setContents(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      }
    } catch (loadError) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error("콘텐츠 로드 실패:", loadError);
      setError(t("loadFailed"));
    } finally {
      if (requestId === loadRequestIdRef.current) {
        hasLoadedRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [activeTab, appliedSearchQuery, compact, currentPage, fetchViewerContents, isViewer, maxItems, pageSize, reviewFilter, sortOption, t, targetUserId, viewMode]);

  const isInitialSeedQuery = activeTab === "all"
    && currentPage === 1
    && pageSize === defaultPageSize
    && appliedSearchQuery.trim().length < 2
    && reviewFilter === "all"
    && sortOption === "recent"
    && viewMode !== "expand";

  useEffect(() => {
    if (hasSeedForInitialQueryRef.current && isInitialSeedQuery) return;
    hasSeedForInitialQueryRef.current = false;
    void loadContents();
  }, [isInitialSeedQuery, loadContents]);

  useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      try {
        const counts = isViewer && targetUserId
          ? ownerKind === 'celeb'
            ? await getCelebContentCounts(targetUserId)
            : await getUserContentCounts(targetUserId)
          : await getContentCounts();
        if (active) setTypeCounts(counts);
      } catch (countError) {
        console.error("타입별 개수 로드 실패:", countError);
      }
    };
    void loadCounts();
    return () => { active = false; };
  }, [isViewer, ownerKind, targetUserId]);

  useEffect(() => {
    if (!isViewer || contents.length === 0) {
      setSavedContentIds(null);
      return;
    }
    let active = true;
    void checkContentsSaved(contents.map((item) => item.content_id)).then((ids) => {
      if (active) setSavedContentIds(ids);
    });
    return () => { active = false; };
  }, [contents, isViewer]);

  return { contents, setContents, isLoading, isRefreshing, error, totalPages, total, typeCounts, savedContentIds, setSavedContentIds, loadContents };
}
