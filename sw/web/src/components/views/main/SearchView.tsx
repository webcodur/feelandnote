"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, ArrowUpDown } from "lucide-react";
import { FilterChips, FilterSelect, type FilterOption, type ChipOption } from "@/components/ui";
import SearchModeSelector, { type SearchMode } from "./search/SearchModeSelector";
import { ContentResults, UserResults, TagResults } from "./search/SearchResultCards";
import { searchContents, searchUsers, searchTags, searchArchive } from "@/actions/search";
import type { ContentSearchResult, UserSearchResult, TagSearchResult, ArchiveSearchResult } from "@/actions/search";
import { CATEGORIES, type CategoryId } from "@/constants/categories";

type ContentResult = ContentSearchResult | ArchiveSearchResult;

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

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const modeParam = (searchParams.get("mode") as SearchMode) || "content";
  const categoryParam = (searchParams.get("category") as CategoryId) || "book";
  const queryParam = searchParams.get("q") || "";

  const [mode, setMode] = useState<SearchMode>(modeParam);
  const [query, setQuery] = useState(queryParam);
  const [category, setCategory] = useState<CategoryId>(categoryParam);
  const [sortBy, setSortBy] = useState("relevance");
  const [isLoading, setIsLoading] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);

  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [tagResults, setTagResults] = useState<TagSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const updateUrl = (newMode: SearchMode, newQuery: string, newCategory?: CategoryId) => {
    const params = new URLSearchParams();
    params.set("mode", newMode);
    if (newMode === "content" && newCategory) params.set("category", newCategory);
    if (newQuery) params.set("q", newQuery);
    router.push(`/search?${params.toString()}`);
  };

  useEffect(() => {
    if (!queryParam) return;
    setIsLoading(true);
    let cancelled = false;

    const performSearch = async () => {
      try {
        if (modeParam === "content") {
          const data = await searchContents({ query: queryParam, category: categoryParam });
          if (!cancelled) { setContentResults(data.items); setTotalCount(data.total); }
        } else if (modeParam === "archive") {
          const data = await searchArchive({ query: queryParam, category: category });
          if (!cancelled) { setContentResults(data.items); setTotalCount(data.total); }
        } else if (modeParam === "user") {
          const data = await searchUsers({ query: queryParam });
          if (!cancelled) { setUserResults(data.items); setTotalCount(data.total); }
        } else if (modeParam === "tag") {
          const data = await searchTags({ query: queryParam });
          if (!cancelled) { setTagResults(data.items); setTotalCount(data.total); }
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) updateUrl(mode, query.trim(), category);
  };

  const handleModeChange = (newMode: SearchMode, newCategory?: CategoryId) => {
    setMode(newMode);
    if (newCategory) setCategory(newCategory);
    setIsModeOpen(false);
    if (query) updateUrl(newMode, query, newCategory);
  };

  const handleContentClick = (item: ContentResult) => {
    if (mode === "archive") {
      router.push(`/archive/${item.id}`);
    } else {
      const params = new URLSearchParams();
      params.set("id", item.id);
      params.set("title", item.title);
      params.set("category", item.category);
      if (item.creator) params.set("creator", item.creator);
      if ("thumbnail" in item && item.thumbnail) params.set("thumbnail", item.thumbnail);
      if ("description" in item && item.description) params.set("description", item.description);
      if ("releaseDate" in item && item.releaseDate) params.set("releaseDate", item.releaseDate);
      router.push(`/content/detail?${params.toString()}`);
    }
  };

  return (
    <>
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <SearchModeSelector
            mode={mode}
            category={category}
            isOpen={isModeOpen}
            onToggle={() => setIsModeOpen(!isModeOpen)}
            onModeChange={handleModeChange}
          />
          <div className="flex-1 flex items-center gap-3 bg-bg-card border border-border rounded-xl px-4 focus-within:border-accent transition-colors">
            <Search size={18} className="text-text-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="flex-1 bg-transparent border-none text-text-primary outline-none text-[15px] py-3"
            />
          </div>
          <button type="submit" className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors">
            검색
          </button>
        </div>
      </form>

      {mode === "content" && (
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
          <FilterChips options={CATEGORY_CHIP_OPTIONS} value={category} onChange={(c) => { setCategory(c); if (query) updateUrl("content", query, c); }} variant="filled" showIcon />
          <div className="ml-auto"><FilterSelect options={CONTENT_SORT_OPTIONS} value={sortBy} onChange={setSortBy} icon={ArrowUpDown} /></div>
        </div>
      )}

      {mode === "user" && (
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer"><input type="checkbox" className="rounded" /> 팔로잉만</label>
          <div className="ml-auto"><FilterSelect options={USER_SORT_OPTIONS} value={sortBy} onChange={setSortBy} icon={ArrowUpDown} /></div>
        </div>
      )}

      {queryParam && !isLoading && (
        <div className="mb-6"><h1 className="text-xl font-bold">"{queryParam}" 검색 결과 <span className="text-accent">{totalCount}건</span></h1></div>
      )}

      {isLoading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>}

      {!isLoading && (mode === "content" || mode === "archive") && (
        <ContentResults results={contentResults} mode={mode} onItemClick={handleContentClick} />
      )}
      {!isLoading && mode === "user" && (
        <UserResults results={userResults} onItemClick={(u) => router.push(`/user/${u.id}`)} onFollowToggle={() => {}} />
      )}
      {!isLoading && mode === "tag" && (
        <TagResults results={tagResults} onItemClick={(t) => router.push(`/feed?tag=${encodeURIComponent(t.name)}`)} />
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

export default function SearchView() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
