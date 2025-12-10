"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Book,
  User,
  Hash,
  Folder,
  Loader2,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { Card } from "@/components/ui";
import {
  searchContents,
  searchUsers,
  searchTags,
  searchArchive,
  type ContentSearchResult,
  type UserSearchResult,
  type TagSearchResult,
  type ArchiveSearchResult,
} from "@/actions/search";
import { CATEGORIES, type CategoryId } from "@/constants/categories";

type SearchMode = "content" | "user" | "tag" | "archive";

interface SearchModeConfig {
  id: SearchMode;
  label: string;
  icon: React.ElementType;
}

const SEARCH_MODES: SearchModeConfig[] = [
  { id: "content", label: "콘텐츠", icon: Book },
  { id: "user", label: "사용자", icon: User },
  { id: "tag", label: "태그", icon: Hash },
  { id: "archive", label: "내 기록", icon: Folder },
];

// 카테고리 아이콘 맵 생성
const CATEGORY_ICONS: Record<string, React.ElementType> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.icon])
);

// Use types from actions
type ContentResult = ContentSearchResult | ArchiveSearchResult;
type UserResult = UserSearchResult;
type TagResult = TagSearchResult;

function SearchLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin text-accent" />
    </div>
  );
}

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

  // Results
  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [tagResults, setTagResults] = useState<TagResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Update URL when mode/query/category changes
  const updateUrl = (newMode: SearchMode, newQuery: string, newCategory?: CategoryId) => {
    const params = new URLSearchParams();
    params.set("mode", newMode);
    if (newMode === "content" && newCategory) {
      params.set("category", newCategory);
    }
    if (newQuery) params.set("q", newQuery);
    router.push(`/search?${params.toString()}`);
  };

  // Search effect
  useEffect(() => {
    if (!queryParam) return;

    setIsLoading(true);
    let cancelled = false;

    const performSearch = async () => {
      try {
        if (modeParam === "content") {
          const data = await searchContents({
            query: queryParam,
            category: categoryParam,
          });
          if (!cancelled) {
            setContentResults(data.items);
            setTotalCount(data.total);
          }
        } else if (modeParam === "archive") {
          const data = await searchArchive({
            query: queryParam,
            category: category,
          });
          if (!cancelled) {
            setContentResults(data.items);
            setTotalCount(data.total);
          }
        } else if (modeParam === "user") {
          const data = await searchUsers({ query: queryParam });
          if (!cancelled) {
            setUserResults(data.items);
            setTotalCount(data.total);
          }
        } else if (modeParam === "tag") {
          const data = await searchTags({ query: queryParam });
          if (!cancelled) {
            setTagResults(data.items);
            setTotalCount(data.total);
          }
        }
      } catch (error) {
        console.error("검색 에러:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    performSearch();

    return () => {
      cancelled = true;
    };
  }, [queryParam, modeParam, categoryParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      updateUrl(mode, query.trim(), category);
    }
  };

  const currentMode = SEARCH_MODES.find((m) => m.id === mode)!;
  const currentCategory = CATEGORIES.find((c) => c.id === category);

  // 콘텐츠 모드일 때 카테고리 아이콘/라벨, 아니면 모드 아이콘/라벨
  const DisplayIcon = mode === "content" && currentCategory ? currentCategory.icon : currentMode.icon;
  const displayLabel = mode === "content" && currentCategory ? currentCategory.label : currentMode.label;

  return (
    <>
      {/* Search Header */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          {/* Mode/Category Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsModeOpen(!isModeOpen)}
              className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary hover:border-accent transition-colors"
            >
              <DisplayIcon size={18} />
              <span>{displayLabel}</span>
              <ChevronDown size={14} className={`transition-transform ${isModeOpen ? "rotate-180" : ""}`} />
            </button>

            {isModeOpen && (
              <div className="absolute top-full left-0 mt-1 bg-bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[180px]">
                {/* 콘텐츠 카테고리 */}
                <div className="px-4 py-1.5 text-xs text-text-secondary font-medium border-b border-border">콘텐츠</div>
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setMode("content");
                        setCategory(cat.id);
                        setIsModeOpen(false);
                        if (query) updateUrl("content", query, cat.id);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors
                        ${mode === "content" && category === cat.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
                    >
                      <Icon size={16} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}

                {/* 기타 모드 */}
                <div className="px-4 py-1.5 text-xs text-text-secondary font-medium border-t border-b border-border mt-1">기타</div>
                {SEARCH_MODES.filter((m) => m.id !== "content").map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id);
                        setIsModeOpen(false);
                        if (query) updateUrl(m.id, query);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors
                        ${mode === m.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
                    >
                      <Icon size={16} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Input */}
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

          <button
            type="submit"
            className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors"
          >
            검색
          </button>
        </div>
      </form>

      {/* Category tabs for content mode */}
      {mode === "content" && (
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    if (query) updateUrl("content", query, cat.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${category === cat.id ? "bg-accent/20 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1.5 bg-bg-card border border-border rounded-lg py-1.5 px-3">
            <ArrowUpDown size={14} className="text-text-secondary" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-text-secondary text-sm outline-none cursor-pointer"
            >
              <option value="relevance">관련도순</option>
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
            </select>
          </div>
        </div>
      )}

      {mode === "user" && (
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" className="rounded" />
            팔로잉만
          </label>

          <div className="ml-auto flex items-center gap-1.5 bg-bg-card border border-border rounded-lg py-1.5 px-3">
            <ArrowUpDown size={14} className="text-text-secondary" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-text-secondary text-sm outline-none cursor-pointer"
            >
              <option value="relevance">관련도순</option>
              <option value="followers">팔로워순</option>
              <option value="latest">최신순</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Header */}
      {queryParam && !isLoading && (
        <div className="mb-6">
          <h1 className="text-xl font-bold">
            "{queryParam}" 검색 결과 <span className="text-accent">{totalCount}건</span>
          </h1>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      )}

      {/* Content Results */}
      {!isLoading && (mode === "content" || mode === "archive") && contentResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {contentResults.map((item) => {
            const CategoryIcon = CATEGORY_ICONS[item.category] || Book;
            const thumbnail = "thumbnail" in item ? item.thumbnail : undefined;
            const status = "status" in item ? item.status : undefined;
            const rating = "rating" in item ? item.rating : undefined;
            return (
              <Card
                key={item.id}
                className="p-0 cursor-pointer hover:border-accent transition-colors"
                onClick={() => {
                  // "내 기록" 모드면 archive로, 콘텐츠 검색이면 content/detail로
                  if (mode === "archive") {
                    router.push(`/archive/${item.id}`);
                  } else {
                    // 쿼리 파라미터로 메타데이터 전달
                    const params = new URLSearchParams();
                    params.set("id", item.id);
                    params.set("title", item.title);
                    params.set("category", item.category);
                    if (item.creator) params.set("creator", item.creator);
                    if (thumbnail) params.set("thumbnail", thumbnail);
                    if ("description" in item && item.description) params.set("description", item.description);
                    if ("releaseDate" in item && item.releaseDate) params.set("releaseDate", item.releaseDate);
                    router.push(`/content/detail?${params.toString()}`);
                  }
                }}
              >
                <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-900 rounded-t-xl flex items-center justify-center overflow-hidden">
                  {thumbnail ? (
                    <img src={thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <CategoryIcon size={32} className="text-gray-500" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-text-primary truncate">{item.title}</h3>
                  <p className="text-xs text-text-secondary truncate">{item.creator}</p>
                  {rating && (
                    <div className="text-yellow-400 text-xs mt-1">
                      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                    </div>
                  )}
                  {status && (
                    <div className="text-xs text-accent mt-1">{status}</div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* User Results */}
      {!isLoading && mode === "user" && userResults.length > 0 && (
        <div className="space-y-3">
          {userResults.map((user) => (
            <Card
              key={user.id}
              className="p-4 cursor-pointer hover:border-accent transition-colors"
              onClick={() => router.push(`/user/${user.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary">{user.nickname}</h3>
                  <p className="text-sm text-text-secondary">{user.username}</p>
                </div>
                <div className="text-sm text-text-secondary">
                  팔로워 {user.followerCount >= 1000 ? `${(user.followerCount / 1000).toFixed(1)}K` : user.followerCount}
                </div>
                <button
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${user.isFollowing ? "bg-white/10 text-text-primary" : "bg-accent text-white"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle follow
                  }}
                >
                  {user.isFollowing ? "팔로잉" : "팔로우"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tag Results */}
      {!isLoading && mode === "tag" && tagResults.length > 0 && (
        <div className="space-y-3">
          {tagResults.map((tag) => (
            <Card
              key={tag.id}
              className="p-4 cursor-pointer hover:border-accent transition-colors"
              onClick={() => router.push(`/feed?tag=${encodeURIComponent(tag.name)}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Hash size={24} className="text-text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary">#{tag.name}</h3>
                  <p className="text-sm text-text-secondary">게시물 {tag.postCount.toLocaleString()}개</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && queryParam && totalCount === 0 && (
        <div className="py-20 text-center">
          <Search size={48} className="mx-auto text-text-secondary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            "{queryParam}"에 대한 검색 결과가 없습니다
          </h2>
          <p className="text-text-secondary">다른 검색어를 입력해보세요</p>
        </div>
      )}

      {/* Initial State */}
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
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
