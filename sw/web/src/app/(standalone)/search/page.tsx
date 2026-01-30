/*
  파일명: /app/(standalone)/search/page.tsx
  기능: 검색 페이지
  책임: 콘텐츠/유저/태그 검색 기능을 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, Suspense, useTransition, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, ArrowUpDown, Info } from "lucide-react";
import { FilterChips, FilterSelect, type FilterOption, type ChipOption } from "@/components/ui";
import Button from "@/components/ui/Button";
import { ContentResults, UserResults, TagResults } from "@/components/shared/search/SearchResultCards";
import { searchContents, searchUsers, searchTags, searchRecords } from "@/actions/search";
import { addContent } from "@/actions/contents/addContent";
import { getMyContentIds } from "@/actions/contents/getMyContentIds";
import { batchUpdateContentMetadata } from "@/actions/contents/updateContentMetadata";
import type { ContentSearchResult, UserSearchResult, TagSearchResult, RecordsSearchResult } from "@/actions/search";
import { CATEGORIES, getCategoryById, type CategoryId } from "@/constants/categories";
import type { ContentType, ContentStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

type SearchMode = "content" | "user" | "tag" | "records";
type ContentResult = ContentSearchResult | RecordsSearchResult;

// 카테고리별 검색 안내 문구
const CATEGORY_SEARCH_GUIDE: Partial<Record<CategoryId, string>> = {
  game: "검색 결과가 더 있을 수 있어요. 원하는 게임이 없다면 검색어나 언어를 바꿔보세요.",
  certificate: "주요 국가자격증 위주로 검색돼요.",
};

// 카테고리별 API 출처 정보
const API_SOURCE_INFO: Record<Exclude<CategoryId, "all">, { name: string; url: string }> = {
  book: { name: "네이버 책 API", url: "https://developers.naver.com/docs/serviceapi/search/book/book.md" },
  video: { name: "TMDB", url: "https://www.themoviedb.org" },
  game: { name: "IGDB", url: "https://www.igdb.com" },
  music: { name: "Spotify", url: "https://developer.spotify.com" },
  certificate: { name: "Q-Net", url: "https://www.q-net.or.kr" },
};

const CATEGORY_CHIP_OPTIONS: ChipOption<CategoryId>[] = CATEGORIES.map((cat) => ({
  value: cat.id, label: cat.label, icon: cat.icon,
}));

const CONTENT_SORT_OPTIONS: FilterOption[] = [
  { value: "relevance", label: "관련도순" },
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
];

const USER_SORT_OPTIONS: FilterOption[] = [
  { value: "relevance", label: "관련도순" },
  { value: "followers", label: "팔로워순" },
  { value: "latest", label: "최신순" },
];

const categoryToContentType = (category: string): ContentType => {
  const config = getCategoryById(category as CategoryId);
  return (config?.dbType as ContentType) || "BOOK";
};

function SearchContent() {
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

  // 검색 조건 변경 시 초기화
  useEffect(() => {
    setPage(1);
    setHasMore(false);
    setContentResults([]);
    setUserResults([]);
    setTagResults([]);
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

  const handleAddWithStatus = (item: ContentResult, status: ContentStatus) => {
    if (addingIds.has(item.id) || addedIds.has(item.id)) return;

    setAddingIds((prev) => new Set(prev).add(item.id));

    startTransition(async () => {
      try {
        const thumbnail = "thumbnail" in item ? item.thumbnail : undefined;
        const description = "description" in item ? item.description : undefined;
        const releaseDate = "releaseDate" in item ? item.releaseDate : undefined;
        const metadata = "metadata" in item ? (item.metadata as Record<string, unknown>) : undefined;
        const subtype = "subtype" in item ? (item.subtype as string) : undefined;

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
          status,
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

  return (
    <>
      {modeParam === "content" && (
        <div className="mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <FilterChips options={CATEGORY_CHIP_OPTIONS} value={category} onChange={(c) => { setCategory(c); updateUrl(c); }} variant="filled" showIcon />
            <div className="ml-auto"><FilterSelect options={CONTENT_SORT_OPTIONS} value={sortBy} onChange={setSortBy} icon={ArrowUpDown} /></div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-text-tertiary">
            <Info size={12} />
            <span>
              검색 제공:{" "}
              <a
                href={API_SOURCE_INFO[category as Exclude<CategoryId, "all">].url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent/60 hover:text-accent underline underline-offset-2"
              >
                {API_SOURCE_INFO[category as Exclude<CategoryId, "all">].name}
              </a>
            </span>
          </div>
          {CATEGORY_SEARCH_GUIDE[category] && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
              <Info size={12} className="invisible" />
              <span>{CATEGORY_SEARCH_GUIDE[category]}</span>
            </div>
          )}
        </div>
      )}

      {modeParam === "user" && (
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer"><input type="checkbox" className="rounded" /> 팔로잉만</label>
          <div className="ml-auto"><FilterSelect options={USER_SORT_OPTIONS} value={sortBy} onChange={setSortBy} icon={ArrowUpDown} /></div>
        </div>
      )}

      {queryParam && !isLoading && (
        <div className="mb-6"><h1 className="text-xl font-bold">"{queryParam}" 검색 결과 <span className="text-accent">{totalCount}건</span></h1></div>
      )}

      {isLoading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>}

      {!isLoading && (modeParam === "content" || modeParam === "records") && (
        <ContentResults
          results={contentResults}
          mode={modeParam}
          currentUserId={currentUserId}
          addingIds={addingIds}
          addedIds={addedIds}
          savedIds={savedIds}
          onBeforeNavigate={handleBeforeNavigate}
          onAddWithStatus={handleAddWithStatus}
        />
      )}
      {!isLoading && modeParam === "user" && (
        <UserResults results={userResults} onItemClick={(u) => router.push(`/${u.id}`)} />
      )}
      {!isLoading && modeParam === "tag" && (
        <TagResults results={tagResults} onItemClick={(t) => router.push(`/feed?tag=${encodeURIComponent(t.name)}`)} />
      )}

      {/* 더보기 버튼 */}
      {!isLoading && hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            unstyled
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-8 py-3 bg-bg-card border border-border rounded-xl font-medium text-text-primary hover:border-accent disabled:opacity-50"
          >
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                불러오는 중...
              </span>
            ) : (
              "더보기"
            )}
          </Button>
        </div>
      )}

      {/* 모든 결과 로드 완료 */}
      {!isLoading && !hasMore && queryParam && totalCount > 0 && (
        <div className="mt-8 text-center text-sm text-text-secondary">
          모든 검색 결과를 불러왔습니다. (총 {contentResults.length || userResults.length || tagResults.length}건)
        </div>
      )}

      {!isLoading && queryParam && totalCount === 0 && (
        <div className="py-20 text-center">
          <Search size={48} className="mx-auto text-text-secondary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">"{queryParam}"에 대한 검색 결과가 없습니다</h2>
          <p className="text-text-secondary">다른 검색어를 입력해보세요</p>
        </div>
      )}

      {!queryParam && (
        <div className="py-20 text-center">
          <Search size={48} className="mx-auto text-text-secondary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">검색어를 입력하세요</h2>
          <p className="text-text-secondary">콘텐츠, 사용자, 태그를 검색할 수 있습니다</p>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
