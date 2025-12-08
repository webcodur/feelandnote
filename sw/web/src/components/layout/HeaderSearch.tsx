"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Book,
  Film,
  Tv,
  Gamepad2,
  Music,
  Drama,
  User,
  Hash,
  Folder,
  Clock,
  Loader2,
} from "lucide-react";
import { searchContents, searchUsers, searchTags, searchArchive } from "@/actions/search";

type SearchMode = "content" | "user" | "tag" | "archive";
type ContentCategory = "book" | "movie" | "drama" | "game";

interface SearchModeConfig {
  id: SearchMode;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  hasSubcategory?: boolean;
}

interface ContentCategoryConfig {
  id: ContentCategory;
  label: string;
  icon: React.ElementType;
  placeholder: string;
}

const SEARCH_MODES: SearchModeConfig[] = [
  { id: "content", label: "콘텐츠", icon: Book, placeholder: "작품명, 저자, 감독...", hasSubcategory: true },
  { id: "user", label: "사용자", icon: User, placeholder: "닉네임, @username..." },
  { id: "tag", label: "태그", icon: Hash, placeholder: "태그명..." },
  { id: "archive", label: "내 기록", icon: Folder, placeholder: "내 기록관에서 검색..." },
];

const CONTENT_CATEGORIES: ContentCategoryConfig[] = [
  { id: "book", label: "도서", icon: Book, placeholder: "책 제목, 저자..." },
  { id: "movie", label: "영화", icon: Film, placeholder: "영화 제목, 감독..." },
  { id: "drama", label: "드라마", icon: Tv, placeholder: "드라마 제목..." },
  { id: "game", label: "게임", icon: Gamepad2, placeholder: "게임 제목, 개발사..." },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  book: Book,
  movie: Film,
  drama: Tv,
  animation: Music,
  game: Gamepad2,
  performance: Drama,
};

interface SearchResult {
  id: string;
  type: "content" | "user" | "tag";
  title: string;
  subtitle?: string;
  category?: string;
  extra?: string;
  thumbnail?: string;
}

export default function HeaderSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("content");
  const [contentCategory, setContentCategory] = useState<ContentCategory>("book");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMode = SEARCH_MODES.find((m) => m.id === mode)!;
  const currentCategory = CONTENT_CATEGORIES.find((c) => c.id === contentCategory)!;

  // Load recent searches from localStorage
  useEffect(() => {
    const key = mode === "content" ? `search_recent_${mode}_${contentCategory}` : `search_recent_${mode}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    } else {
      setRecentSearches([]);
    }
  }, [mode, contentCategory]);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    const key = mode === "content" ? `search_recent_${mode}_${contentCategory}` : `search_recent_${mode}`;
    const stored = localStorage.getItem(key);
    let searches: string[] = stored ? JSON.parse(stored) : [];

    // Remove duplicate and add to front
    searches = searches.filter((s) => s !== searchQuery);
    searches.unshift(searchQuery);
    searches = searches.slice(0, 10); // Keep max 10

    localStorage.setItem(key, JSON.stringify(searches));
    setRecentSearches(searches);
  }, [mode, contentCategory]);

  // Clear recent searches
  const clearRecentSearches = () => {
    const key = mode === "content" ? `search_recent_${mode}_${contentCategory}` : `search_recent_${mode}`;
    localStorage.removeItem(key);
    setRecentSearches([]);
  };

  // Search API
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const abortController = new AbortController();

    const performSearch = async () => {
      try {
        const searchResults: SearchResult[] = [];

        if (mode === "content") {
          // 선택된 카테고리만 검색
          const data = await searchContents({ query, category: contentCategory, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id,
              type: "content",
              title: item.title,
              subtitle: item.creator,
              category: item.category,
              thumbnail: item.thumbnail,
            });
          });
        } else if (mode === "user") {
          const data = await searchUsers({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id,
              type: "user",
              title: item.nickname,
              subtitle: item.username,
              extra: `팔로워 ${item.followerCount >= 1000 ? `${(item.followerCount / 1000).toFixed(1)}K` : item.followerCount}`,
            });
          });
        } else if (mode === "tag") {
          const data = await searchTags({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id,
              type: "tag",
              title: `#${item.name}`,
              extra: `게시물 ${item.postCount.toLocaleString()}개`,
            });
          });
        } else if (mode === "archive") {
          const data = await searchArchive({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id,
              type: "content",
              title: item.title,
              subtitle: item.status,
              category: item.category,
              thumbnail: item.thumbnail,
              extra: item.rating ? "★".repeat(item.rating) : item.progress ? `${item.progress}%` : undefined,
            });
          });
        }

        if (!abortController.signal.aborted) {
          setResults(searchResults);
          setIsLoading(false);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("검색 에러:", error);
          setResults([]);
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(performSearch, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query, mode, contentCategory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K to focus
      if (e.ctrlKey && e.code === "KeyK") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle input keyboard navigation
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = results.length || recentSearches.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (results.length > 0) {
            handleResultClick(results[selectedIndex]);
          } else if (recentSearches.length > 0) {
            setQuery(recentSearches[selectedIndex]);
          }
        } else if (query.trim()) {
          handleSearch();
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case "Tab":
        if (!e.shiftKey) {
          e.preventDefault();
          const currentIndex = SEARCH_MODES.findIndex((m) => m.id === mode);
          const nextIndex = (currentIndex + 1) % SEARCH_MODES.length;
          setMode(SEARCH_MODES[nextIndex].id);
        } else {
          e.preventDefault();
          const currentIndex = SEARCH_MODES.findIndex((m) => m.id === mode);
          const prevIndex = (currentIndex - 1 + SEARCH_MODES.length) % SEARCH_MODES.length;
          setMode(SEARCH_MODES[prevIndex].id);
        }
        break;
    }

    // @ for user mode, # for tag mode
    if (e.key === "@" && query === "") {
      e.preventDefault();
      setMode("user");
    } else if (e.key === "#" && query === "") {
      e.preventDefault();
      setMode("tag");
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    saveRecentSearch(query.trim());
    const categoryParam = mode === "content" ? `&category=${contentCategory}` : "";
    router.push(`/search?mode=${mode}${categoryParam}&q=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query.trim());

    if (result.type === "content") {
      // "내 기록" 모드에서 검색한 경우는 archive로, 일반 콘텐츠 검색은 content로
      if (mode === "archive") {
        router.push(`/archive/${result.id}`);
      } else {
        router.push(`/content/${result.id}`);
      }
    } else if (result.type === "user") {
      router.push(`/user/${result.id}`);
    } else if (result.type === "tag") {
      router.push(`/search?mode=tag&q=${encodeURIComponent(result.title.replace("#", ""))}`);
    }

    setIsOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsModeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 표시할 아이콘과 라벨 결정
  const DisplayIcon = mode === "content" ? currentCategory.icon : currentMode.icon;
  const displayLabel = mode === "content" ? currentCategory.label : currentMode.label;
  const displayPlaceholder = mode === "content" ? currentCategory.placeholder : currentMode.placeholder;

  return (
    <div ref={containerRef} className="flex-1 max-w-[600px] mx-auto relative">
      {/* Search Bar */}
      <div
        className={`w-full bg-bg-main border rounded-xl flex items-center transition-all duration-200
          ${isOpen ? "border-accent shadow-lg shadow-accent/10" : "border-border"}`}
      >
        {/* Mode Selector */}
        <div className="relative">
          <button
            onClick={() => setIsModeOpen(!isModeOpen)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors border-r border-border"
          >
            <DisplayIcon size={16} />
            <span className="hidden sm:inline">{displayLabel}</span>
            <ChevronDown size={14} className={`transition-transform ${isModeOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Mode Dropdown */}
          {isModeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-bg-card border border-border rounded-lg shadow-xl z-50 py-1 min-w-[180px]">
              {/* 콘텐츠 카테고리 */}
              <div className="px-3 py-1.5 text-xs text-text-secondary font-medium border-b border-border">콘텐츠</div>
              {CONTENT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setMode("content");
                      setContentCategory(cat.id);
                      setIsModeOpen(false);
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                      ${mode === "content" && contentCategory === cat.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
                  >
                    <Icon size={16} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}

              {/* 기타 모드 */}
              <div className="px-3 py-1.5 text-xs text-text-secondary font-medium border-t border-b border-border mt-1">기타</div>
              {SEARCH_MODES.filter((m) => m.id !== "content").map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id);
                      setIsModeOpen(false);
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
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
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search size={18} className="text-text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={displayPlaceholder}
            className="flex-1 bg-transparent border-none text-text-primary outline-none text-[15px] placeholder:text-text-secondary py-2.5"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Keyboard hint */}
        <div className="hidden sm:flex items-center gap-1 px-3 text-xs text-text-secondary">
          <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">Ctrl</kbd>
          <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">K</kbd>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <>
              {results.map((result, index) => {
                const CategoryIcon = result.category ? CATEGORY_ICONS[result.category] || Book : null;

                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${selectedIndex === index ? "bg-accent/10" : "hover:bg-white/5"}`}
                  >
                    {result.type === "content" && (
                      <div className="w-10 h-14 rounded-md bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {result.thumbnail ? (
                          <img
                            src={result.thumbnail}
                            alt={result.title}
                            className="w-full h-full object-cover"
                          />
                        ) : CategoryIcon ? (
                          <CategoryIcon size={16} className="text-text-secondary" />
                        ) : null}
                      </div>
                    )}
                    {result.type === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0" />
                    )}
                    {result.type === "tag" && (
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <Hash size={16} className="text-text-secondary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-text-secondary truncate">{result.subtitle}</div>
                      )}
                    </div>
                    {result.extra && (
                      <div className="text-xs text-text-secondary shrink-0">{result.extra}</div>
                    )}
                  </button>
                );
              })}

              {/* View all results */}
              <button
                onClick={handleSearch}
                className="w-full px-4 py-3 text-sm text-accent hover:bg-accent/5 transition-colors border-t border-border"
              >
                "{query}" 검색 결과 더보기 →
              </button>
            </>
          )}

          {/* Recent Searches (when no query) */}
          {!isLoading && !query && recentSearches.length > 0 && (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs text-text-secondary font-medium">최근 검색</span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-text-secondary hover:text-accent transition-colors"
                >
                  지우기
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => {
                    setQuery(search);
                    inputRef.current?.focus();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                    ${selectedIndex === index ? "bg-accent/10" : "hover:bg-white/5"}`}
                >
                  <Clock size={14} className="text-text-secondary" />
                  <span className="text-sm text-text-primary">{search}</span>
                </button>
              ))}
            </>
          )}

          {/* Empty state */}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center">
              <Search size={32} className="mx-auto text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">"{query}"에 대한 결과가 없습니다</p>
            </div>
          )}

          {/* Initial state hint */}
          {!isLoading && !query && recentSearches.length === 0 && (
            <div className="py-6 px-4 text-center">
              <p className="text-sm text-text-secondary mb-2">검색어를 입력하세요</p>
              <div className="flex items-center justify-center gap-4 text-xs text-text-secondary">
                <span><kbd className="px-1 bg-white/5 rounded">@</kbd> 사용자</span>
                <span><kbd className="px-1 bg-white/5 rounded">#</kbd> 태그</span>
                <span><kbd className="px-1 bg-white/5 rounded">Tab</kbd> 모드 전환</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
