"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchContents, searchUsers, searchTags, searchArchive } from "@/actions/search";
import { addContent } from "@/actions/contents/addContent";
import { SearchMode, ContentCategory, SEARCH_MODES } from "@/components/shared/search/SearchModeDropdown";
import type { SearchResult } from "@/components/shared/search/SearchResultsDropdown";
import { getCategoryById } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

const categoryToContentType = (category: string): ContentType => {
  const config = getCategoryById(category as ContentCategory);
  return (config?.dbType as ContentType) || "BOOK";
};

export function useHeaderSearch() {
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
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 현재 사용자 ID 가져오기
  useEffect(() => {
    const fetchUserId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUserId();
  }, []);

  // #region Recent Searches
  useEffect(() => {
    const key = mode === "content" ? `search_recent_${mode}_${contentCategory}` : `search_recent_${mode}`;
    const stored = localStorage.getItem(key);
    setRecentSearches(stored ? JSON.parse(stored) : []);
  }, [mode, contentCategory]);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    const key = mode === "content" ? `search_recent_${mode}_${contentCategory}` : `search_recent_${mode}`;
    const stored = localStorage.getItem(key);
    let searches: string[] = stored ? JSON.parse(stored) : [];
    searches = searches.filter((s) => s !== searchQuery);
    searches.unshift(searchQuery);
    searches = searches.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(searches));
    setRecentSearches(searches);
  }, [mode, contentCategory]);

  const clearRecentSearches = () => {
    const key = mode === "content" ? `search_recent_${mode}_${contentCategory}` : `search_recent_${mode}`;
    localStorage.removeItem(key);
    setRecentSearches([]);
  };
  // #endregion

  // #region Search API
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
              id: item.id, type: "content", title: item.title, subtitle: item.creator,
              category: item.category, subtype: item.subtype, thumbnail: item.thumbnail,
              description: item.description, releaseDate: item.releaseDate, metadata: item.metadata,
            });
          });
        } else if (mode === "user") {
          const data = await searchUsers({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id, type: "user", title: item.nickname, subtitle: item.username,
              extra: `팔로워 ${item.followerCount >= 1000 ? `${(item.followerCount / 1000).toFixed(1)}K` : item.followerCount}`,
            });
          });
        } else if (mode === "tag") {
          const data = await searchTags({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id, type: "tag", title: `#${item.name}`, extra: `게시물 ${item.postCount.toLocaleString()}개`,
            });
          });
        } else if (mode === "archive") {
          const data = await searchArchive({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.contentId, type: "content", title: item.title, subtitle: item.status,
              category: item.category, thumbnail: item.thumbnail,
              extra: item.rating ? "★".repeat(item.rating) : undefined,
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
  // #endregion

  // #region Keyboard Shortcuts
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
  // #endregion

  // #region Click Outside
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
  // #endregion

  // #region Handlers
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
      if (mode === "archive" && currentUserId) {
        router.push(`/${currentUserId}/records/${result.id}`);
      } else {
        const key = `content_${result.id}`;
        sessionStorage.setItem(key, JSON.stringify({
          id: result.id, title: result.title, category: result.category || "book",
          creator: result.subtitle, thumbnail: result.thumbnail, description: result.description,
          releaseDate: result.releaseDate, subtype: result.subtype, metadata: result.metadata,
        }));
        router.push(`/content/detail?key=${key}`);
      }
    } else if (result.type === "user") {
      router.push(`/${result.id}`);
    } else if (result.type === "tag") {
      router.push(`/search?mode=tag&q=${encodeURIComponent(result.title.replace("#", ""))}`);
    }
    setIsOpen(false);
  };

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
          metadata: result.metadata,
          subtype: result.subtype,
          status: "WANT",
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

  const handleOpenInNewTab = (result: SearchResult) => {
    const key = `content_${result.id}`;
    sessionStorage.setItem(key, JSON.stringify({
      id: result.id, title: result.title, category: result.category || "book",
      creator: result.subtitle, thumbnail: result.thumbnail, description: result.description,
      releaseDate: result.releaseDate, subtype: result.subtype, metadata: result.metadata,
    }));
    window.open(`/content/detail?key=${key}`, "_blank");
  };

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
          if (results.length > 0) handleResultClick(results[selectedIndex]);
          else if (recentSearches.length > 0) setQuery(recentSearches[selectedIndex]);
        } else if (query.trim()) {
          handleSearch();
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case "Tab":
        e.preventDefault();
        const currentIndex = SEARCH_MODES.findIndex((m) => m.id === mode);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + SEARCH_MODES.length) % SEARCH_MODES.length
          : (currentIndex + 1) % SEARCH_MODES.length;
        setMode(SEARCH_MODES[nextIndex].id);
        break;
    }

    if (e.key === "@" && query === "") {
      e.preventDefault();
      setMode("user");
    } else if (e.key === "#" && query === "") {
      e.preventDefault();
      setMode("tag");
    }
  };

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode);
    inputRef.current?.focus();
  };

  const handleCategoryChange = (category: ContentCategory) => {
    setContentCategory(category);
    inputRef.current?.focus();
  };
  // #endregion

  return {
    // Refs
    containerRef, inputRef,
    // State
    isOpen, setIsOpen, isModeOpen, setIsModeOpen,
    mode, contentCategory, query, setQuery,
    results, recentSearches, isLoading, selectedIndex, setSelectedIndex,
    addingIds, addedIds,
    // Handlers
    handleSearch, handleResultClick, handleAddToArchive, handleOpenInNewTab,
    handleInputKeyDown, handleModeChange, handleCategoryChange, clearRecentSearches,
  };
}
