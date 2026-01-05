"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { searchContents, searchUsers, searchTags, searchArchive } from "@/actions/search";
import { addContent } from "@/actions/contents/addContent";
import SearchModeDropdown, {
  SearchMode,
  ContentCategory,
  SEARCH_MODES,
  CONTENT_CATEGORIES,
} from "./search/SearchModeDropdown";
import SearchResultsDropdown, { SearchResult } from "./search/SearchResultsDropdown";
import Button from "@/components/ui/Button";
import { getCategoryById } from "@/constants/categories";
import type { ContentType } from "@/types/database";

// 카테고리 ID를 ContentType으로 변환
const categoryToContentType = (category: string): ContentType => {
  const config = getCategoryById(category as ContentCategory);
  return (config?.dbType as ContentType) || "BOOK";
};

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

  // 추가 중인 콘텐츠 ID 추적
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMode = SEARCH_MODES.find((m) => m.id === mode)!;
  const currentCategory = CONTENT_CATEGORIES.find((c) => c.id === contentCategory)!;

  // 표시할 placeholder 결정
  const displayPlaceholder = mode === "content" ? currentCategory.placeholder : currentMode.placeholder;

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
          const data = await searchContents({ query, category: contentCategory, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id,
              type: "content",
              title: item.title,
              subtitle: item.creator,
              category: item.category,
              subtype: item.subtype,
              thumbnail: item.thumbnail,
              description: item.description,
              releaseDate: item.releaseDate,
              metadata: item.metadata,
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
      if (mode === "archive") {
        router.push(`/archive/${result.id}`);
      } else {
        const key = `content_${result.id}`;
        const data = {
          id: result.id,
          title: result.title,
          category: result.category || "book",
          creator: result.subtitle,
          thumbnail: result.thumbnail,
          description: result.description,
          releaseDate: result.releaseDate,
          subtype: result.subtype,
          metadata: result.metadata,
        };
        sessionStorage.setItem(key, JSON.stringify(data));
        router.push(`/content/detail?key=${key}`);
      }
    } else if (result.type === "user") {
      router.push(`/archive/user/${result.id}`);
    } else if (result.type === "tag") {
      router.push(`/search?mode=tag&q=${encodeURIComponent(result.title.replace("#", ""))}`);
    }

    setIsOpen(false);
  };

  // 기록관에 바로 추가 (모달 없이)
  const handleAddToArchive = (result: SearchResult) => {
    if (addingIds.has(result.id) || addedIds.has(result.id)) return;

    setAddingIds((prev) => new Set(prev).add(result.id));

    startTransition(async () => {
      try {
        await addContent({
          id: result.id,
          type: categoryToContentType(result.category || "book"),
          title: result.title,
          creator: result.subtitle,
          thumbnailUrl: result.thumbnail,
          description: result.description,
          releaseDate: result.releaseDate,
          status: "WANT",
          progress: 0,
        });
        setAddedIds((prev) => new Set(prev).add(result.id));
      } catch (err) {
        console.error("추가 실패:", err);
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
      }
    });
  };

  // 새 창으로 열기 핸들러 (드롭다운 닫지 않음)
  const handleOpenInNewTab = (result: SearchResult) => {
    const key = `content_${result.id}`;
    const data = {
      id: result.id,
      title: result.title,
      category: result.category || "book",
      creator: result.subtitle,
      thumbnail: result.thumbnail,
      description: result.description,
      releaseDate: result.releaseDate,
      subtype: result.subtype,
      metadata: result.metadata,
    };
    sessionStorage.setItem(key, JSON.stringify(data));
    window.open(`/content/detail?key=${key}`, "_blank");
  };

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode);
    inputRef.current?.focus();
  };

  const handleCategoryChange = (category: ContentCategory) => {
    setContentCategory(category);
    inputRef.current?.focus();
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

  return (
    <div ref={containerRef} className="flex-1 max-w-[600px] mx-auto relative">
      {/* Search Bar */}
      <div
        className={`w-full bg-bg-main border rounded-xl flex items-center
          ${isOpen ? "border-accent shadow-lg shadow-accent/10" : "border-border"}`}
      >
        {/* Mode Selector */}
        <SearchModeDropdown
          isOpen={isModeOpen}
          onToggle={() => {
            setIsModeOpen(!isModeOpen);
            if (!isModeOpen) setIsOpen(false); // 모드 드롭다운 열 때 결과 드롭다운 닫기
          }}
          mode={mode}
          contentCategory={contentCategory}
          onModeChange={handleModeChange}
          onCategoryChange={handleCategoryChange}
          onClose={() => setIsModeOpen(false)}
        />

        {/* Search Input */}
        <div className="flex-1 flex items-center gap-2 px-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              setIsOpen(true);
              setIsModeOpen(false); // 입력창 포커스 시 모드 드롭다운 닫기
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={displayPlaceholder}
            className="flex-1 bg-transparent border-none text-text-primary outline-none text-[15px] placeholder:text-text-secondary py-2.5"
          />
          {query && (
            <Button
              unstyled
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-text-secondary hover:text-text-primary"
            >
              <X size={16} />
            </Button>
          )}
          <Button
            unstyled
            onClick={handleSearch}
            className="text-text-secondary hover:text-accent shrink-0"
          >
            <Search size={18} />
          </Button>
        </div>

        {/* Keyboard hint */}
        <div className="hidden sm:flex items-center gap-1 px-3 text-xs text-text-secondary">
          <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">Ctrl</kbd>
          <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">K</kbd>
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <SearchResultsDropdown
          isLoading={isLoading}
          query={query}
          results={results}
          recentSearches={recentSearches}
          selectedIndex={selectedIndex}
          searchMode={mode}
          addingIds={addingIds}
          addedIds={addedIds}
          onResultClick={handleResultClick}
          onRecentSearchClick={(search) => {
            setQuery(search);
            inputRef.current?.focus();
          }}
          onClearRecentSearches={clearRecentSearches}
          onViewAllResults={handleSearch}
          onAddToArchive={handleAddToArchive}
          onOpenInNewTab={handleOpenInNewTab}
        />
      )}
    </div>
  );
}
