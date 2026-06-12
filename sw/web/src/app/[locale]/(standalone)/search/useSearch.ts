/*
  파일명: /app/(standalone)/search/useSearch.ts
  기능: 검색 페이지 상태 훅
  책임: 검색 실행, 페이지네이션, 콘텐츠 추가 상태를 관리한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { searchContents, searchUsers, searchTags, searchRecords } from "@/actions/search";
import { addContent } from "@/actions/contents/addContent";
import { getMyContentIds } from "@/actions/contents/getMyContentIds";
import { batchUpdateContentMetadata } from "@/actions/contents/updateContentMetadata";
import { getContentUserCounts } from "@/actions/contents/getContentUserCounts";
import type { ContentSearchResult, UserSearchResult, TagSearchResult } from "@/actions/search";
import type { CategoryId } from "@/constants/categories";
import { createClient } from "@/lib/supabase/client";
import { categoryToContentType, type SearchMode, type ContentResult } from "./searchConfig";

export function useSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const modeParam = (searchParams.get("mode") as SearchMode) || "content";
  const categoryParam = (searchParams.get("category") as CategoryId) || "book";
  const queryParam = searchParams.get("q") || "";

  const [category, setCategory] = useState<CategoryId>(categoryParam);
  const [sortBy, setSortBy] = useState("relevance");
  const [isLoading, setIsLoading] = useState(false);

  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [tagResults, setTagResults] = useState<TagSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 추가 상태
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 현재 사용자 ID 및 저장된 콘텐츠 ID 로드
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const ids = await getMyContentIds();
      setSavedIds(new Set(ids));
    };
    init();
  }, []);

  const updateUrl = (newCategory: CategoryId) => {
    const params = new URLSearchParams();
    params.set("mode", modeParam);
    params.set("category", newCategory);
    if (queryParam) params.set("q", queryParam);
    router.push(`/search?${params.toString()}`);
  };

  // 검색 조건 변경 시 초기화 및 URL 파라미터 동기화
  useEffect(() => {
    setCategory(categoryParam);
    setPage(1);
    setHasMore(false);
    setContentResults([]);
    setUserResults([]);
    setTagResults([]);
    setUserCounts({});
  }, [queryParam, modeParam, categoryParam]);

  // 초기 검색
  useEffect(() => {
    if (!queryParam) return;
    setIsLoading(true);
    let cancelled = false;

    const performSearch = async () => {
      try {
        if (modeParam === "content") {
          const data = await searchContents({ query: queryParam, category: categoryParam, page: 1 });
          if (!cancelled) {
            setContentResults(data.items);
            setTotalCount(data.total);
            setHasMore(data.hasMore);
            // DB에서 user_count 조회
            if (data.items.length > 0) {
              const ids = data.items.map((item) => item.id);
              const counts = await getContentUserCounts(ids);
              if (!cancelled) setUserCounts(counts);
            }
          }
        } else if (modeParam === "records") {
          const data = await searchRecords({ query: queryParam, category: category });
          if (!cancelled) {
            setContentResults(data.items);
            setTotalCount(data.total);
            setHasMore(data.hasMore);
          }
        } else if (modeParam === "user") {
          const data = await searchUsers({ query: queryParam, page: 1 });
          if (!cancelled) {
            setUserResults(data.items);
            setTotalCount(data.total);
            setHasMore(data.hasMore);
          }
        } else if (modeParam === "tag") {
          const data = await searchTags({ query: queryParam, page: 1 });
          if (!cancelled) {
            setTagResults(data.items);
            setTotalCount(data.total);
            setHasMore(data.hasMore);
          }
        }
      } catch (error) {
        console.error("검색 에러:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    performSearch();
    return () => { cancelled = true; };
  }, [queryParam, modeParam, categoryParam, category]);

  // 기존 콘텐츠의 metadata 자동 업데이트 (백그라운드)
  useEffect(() => {
    if (modeParam !== "content" || contentResults.length === 0 || savedIds.size === 0) return;

    // 이미 저장된 콘텐츠 중 검색 결과에 있는 것들의 metadata 업데이트
    const itemsToUpdate = contentResults
      .filter((item): item is ContentSearchResult => savedIds.has(item.id) && "metadata" in item && !!item.metadata)
      .map((item) => ({
        id: item.id,
        metadata: item.metadata as Record<string, unknown>,
        subtype: item.subtype,
      }));

    if (itemsToUpdate.length > 0) {
      // fire-and-forget: 백그라운드에서 업데이트
      batchUpdateContentMetadata(itemsToUpdate).catch(console.error);
    }
  }, [contentResults, savedIds, modeParam]);

  // 더보기 로드
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;

    try {
      if (modeParam === "content") {
        const data = await searchContents({ query: queryParam, category: categoryParam, page: nextPage });
        setContentResults((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        // 추가 로드된 항목의 user_count 조회
        if (data.items.length > 0) {
          const ids = data.items.map((item) => item.id);
          const counts = await getContentUserCounts(ids);
          setUserCounts((prev) => ({ ...prev, ...counts }));
        }
      } else if (modeParam === "records") {
        const data = await searchRecords({ query: queryParam, category: category, page: nextPage });
        setContentResults((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
      } else if (modeParam === "user") {
        const data = await searchUsers({ query: queryParam, page: nextPage });
        setUserResults((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
      } else if (modeParam === "tag") {
        const data = await searchTags({ query: queryParam, page: nextPage });
        setTagResults((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
      }
      setPage(nextPage);
    } catch (error) {
      console.error("더보기 에러:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, modeParam, queryParam, categoryParam, category]);

  // Link 이동 전 콜백 (현재 미사용)
  const handleBeforeNavigate = (_item: ContentResult) => {
    // 외부 API로 직접 조회하므로 별도 저장 불필요
  };

  const handleAddContent = (item: ContentResult) => {
    if (addingIds.has(item.id) || addedIds.has(item.id)) return;

    setAddingIds((prev) => new Set(prev).add(item.id));

    startTransition(async () => {
      try {
        const thumbnail = "thumbnail" in item ? item.thumbnail : undefined;
        const description = "description" in item ? item.description : undefined;
        const releaseDate = "releaseDate" in item ? item.releaseDate : undefined;
        const metadata = "metadata" in item ? (item.metadata as Record<string, unknown>) : undefined;
        const subtype = "subtype" in item ? (item.subtype as string) : undefined;
        const externalSource = "externalSource" in item ? (item.externalSource as string) : undefined;

        await addContent({
          id: item.id,
          type: categoryToContentType(item.category),
          title: item.title,
          creator: item.creator,
          thumbnailUrl: thumbnail,
          description,
          releaseDate,
          metadata,
          subtype,
          externalSource,
        });
        setAddedIds((prev) => new Set(prev).add(item.id));
        setSavedIds((prev) => new Set(prev).add(item.id));
      } catch (err) {
        console.error("추가 실패:", err);
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    });
  };

  return {
    router,
    modeParam,
    queryParam,
    category,
    setCategory,
    sortBy,
    setSortBy,
    isLoading,
    contentResults,
    userResults,
    tagResults,
    totalCount,
    hasMore,
    isLoadingMore,
    savedIds,
    userCounts,
    currentUserId,
    updateUrl,
    loadMore,
    handleBeforeNavigate,
    handleAddContent,
  };
}
