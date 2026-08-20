"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { getCelebContentCounts, getContentCounts, getUserContentCounts } from "@/actions/contents/getContentCounts";
import { checkContentsSaved } from "@/actions/contents/getMyContentIds";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import {
  getPublicCelebContents,
  getPublicViewerContents,
} from "@/actions/contents/getUserContents";
import type { ContentTypeCounts } from "@/types/content";

import { mapPublicToUserContent } from "./contentLibraryTypes";
import {
  createContentRequest,
  createLibrarySeed,
  isInitialSeedQuery,
  resolveDatasetPresentation,
  type ContentDatasetMode,
  type ContentLibraryDataOptions,
  type LibrarySeed,
} from "./contentLibraryDataState";

export { resolveDatasetPresentation };

export function useContentLibraryData(options: ContentLibraryDataOptions) {
  const t = useTranslations("archiveSearch");
  const {
    activeTab,
    appliedSearchQuery,
    compact,
    currentPage,
    isResponsiveViewPending,
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
  if (seedRef.current === undefined) seedRef.current = createLibrarySeed(options);
  const seed = seedRef.current;

  const [contents, setContents] = useState<UserContentWithContent[]>(seed?.contents ?? []);
  const [contentsMode, setContentsMode] = useState<ContentDatasetMode | null>(
    seed ? "seed" : null,
  );
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
    const requestedViewMode = viewMode;
    if (hasLoadedRef.current) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const request = createContentRequest({
        activeTab,
        appliedSearchQuery,
        compact,
        currentPage,
        maxItems,
        ownerKind,
        pageSize,
        reviewFilter,
        sortOption,
        viewMode,
      });

      if (isViewer && targetUserId) {
        const result = await fetchViewerContents({
          userId: targetUserId,
          ...request,
        });
        if (requestId !== loadRequestIdRef.current) return;
        setContents(mapPublicToUserContent(result.items, targetUserId));
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } else {
        const result = await getMyContents(request);
        if (requestId !== loadRequestIdRef.current) return;
        setContents(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      }
      setContentsMode(requestedViewMode);
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
  }, [activeTab, appliedSearchQuery, compact, currentPage, fetchViewerContents, isViewer, maxItems, ownerKind, pageSize, reviewFilter, sortOption, t, targetUserId, viewMode]);

  // 펼침의 최대 200행을 목록 카드로 잠깐 재해석하면 DOM·인증·카운트 요청이 폭발한다.
  // 반대 방향(list → expand)은 현재 페이지의 첫 항목을 큰 카드로 즉시 보여주는 안전한 seed다.
  const presentation = resolveDatasetPresentation(contentsMode, viewMode, isLoading);
  const { isStaleExpandDatasetForList } = presentation;

  const hasInitialSeedQuery = isInitialSeedQuery(options);

  useEffect(() => {
    if (hasSeedForInitialQueryRef.current && hasInitialSeedQuery) return;
    hasSeedForInitialQueryRef.current = false;
    void loadContents();
  }, [hasInitialSeedQuery, loadContents]);

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
    if (
      !isViewer
      || contents.length === 0
      || viewMode === "expand"
      || isResponsiveViewPending
      || isStaleExpandDatasetForList
    ) {
      setSavedContentIds(null);
      return;
    }
    let active = true;
    void checkContentsSaved(contents.map((item) => item.content_id)).then((ids) => {
      if (active) setSavedContentIds(ids);
    });
    return () => { active = false; };
  }, [contents, isResponsiveViewPending, isStaleExpandDatasetForList, isViewer, viewMode]);

  return {
    contents: presentation.shouldKeepContents ? contents : [],
    setContents,
    isLoading: presentation.shouldShowBlockingLoading,
    isRefreshing: isRefreshing || (isStaleExpandDatasetForList && error === null),
    error,
    presentationViewMode: presentation.presentationViewMode,
    totalPages,
    total,
    typeCounts,
    savedContentIds,
    setSavedContentIds,
    loadContents,
  };
}
