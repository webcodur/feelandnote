/*
  파일명: /app/(main)/search/page.tsx
  기능: 검색 페이지
  책임: 콘텐츠/유저/태그 검색 기능을 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, Suspense, useTransition, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, ArrowUpDown, Info } from "lucide-react";
import { FilterChips, FilterSelect, type FilterOption, type ChipOption } from "@/components/ui";
import Button from "@/components/ui/Button";
import { ContentResults, UserResults, TagResults } from "@/components/features/search/SearchResultCards";
import { searchContents, searchUsers, searchTags, searchArchive } from "@/actions/search";
import { addContent } from "@/actions/contents/addContent";
import { getMyContentIds } from "@/actions/contents/getMyContentIds";
import type { ContentSearchResult, UserSearchResult, TagSearchResult, ArchiveSearchResult } from "@/actions/search";
import { CATEGORIES, getCategoryById, type CategoryId } from "@/constants/categories";
import type { ContentType } from "@/types/database";

type SearchMode = "content" | "user" | "tag" | "archive";
type ContentResult = ContentSearchResult | ArchiveSearchResult;

// 카테고리별 검색 안내 문구
const CATEGORY_SEARCH_GUIDE: Partial<Record<CategoryId, string>> = {
  game: "검색 결과가 더 있을 수 있어요. 원하는 게임이 없다면 검색어를 바꿔보세요.",
  certificate: "주요 국가자격증 위주로 검색돼요.",
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
  const [, startTransition] = useTransition();

  // 저장된 콘텐츠 ID 로드
  useEffect(() => {
    getMyContentIds().then((ids) => {
      setSavedIds(new Set(ids));
    });
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
        } else if (modeParam === "archive") {
          const data = await searchArchive({ query: queryParam, category: category });
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
      } else if (modeParam === "archive") {
        const data = await searchArchive({ query: queryParam, category: category, page: nextPage });
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

  const handleContentClick = (item: ContentResult) => {
    if (modeParam === "archive") {
      router.push(`/archive/${item.id}`);
    } else {
      const key = `content_${item.id}`;
      sessionStorage.setItem(key, JSON.stringify(item));
      router.push(`/content/detail?key=${key}`);
    }
  };

  const handleAddToArchive = (item: ContentResult) => {
    if (addingIds.has(item.id) || addedIds.has(item.id)) return;

    setAddingIds((prev) => new Set(prev).add(item.id));

    startTransition(async () => {
      try {
        const thumbnail = "thumbnail" in item ? item.thumbnail : undefined;
        const description = "description" in item ? item.description : undefined;
        const releaseDate = "releaseDate" in item ? item.releaseDate : undefined;

        await addContent({
          id: item.id,
          type: categoryToContentType(item.category),
          title: item.title,
          creator: item.creator,
          thumbnailUrl: thumbnail,
          description,
          releaseDate,
          status: "WANT",
          progress: 0,
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

  const handleOpenInNewTab = (item: ContentResult) => {
    const key = `content_${item.id}`;
    sessionStorage.setItem(key, JSON.stringify(item));
    window.open(`/content/detail?key=${key}`, "_blank");
  };

  return (
    <>
      {modeParam === "content" && (
        <div className="mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <FilterChips options={CATEGORY_CHIP_OPTIONS} value={category} onChange={(c) => { setCategory(c); updateUrl(c); }} variant="filled" showIcon />
            <div className="ml-auto"><FilterSelect options={CONTENT_SORT_OPTIONS} value={sortBy} onChange={setSortBy} icon={ArrowUpDown} /></div>
          </div>
          {CATEGORY_SEARCH_GUIDE[category] && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-text-secondary">
              <Info size={12} />
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

      {!isLoading && (modeParam === "content" || modeParam === "archive") && (
        <ContentResults
          results={contentResults}
          mode={modeParam}
          addingIds={addingIds}
          addedIds={addedIds}
          savedIds={savedIds}
          onItemClick={handleContentClick}
          onAddToArchive={handleAddToArchive}
          onOpenInNewTab={handleOpenInNewTab}
        />
      )}
      {!isLoading && modeParam === "user" && (
        <UserResults results={userResults} onItemClick={(u) => router.push(`/archive/user/${u.id}`)} />
      )}
      {!isLoading && modeParam === "tag" && (
        <TagResults results={tagResults} onItemClick={(t) => router.push(`/archive/feed?tag=${encodeURIComponent(t.name)}`)} />
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
