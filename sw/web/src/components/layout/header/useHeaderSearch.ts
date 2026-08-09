"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { searchContents, searchUsers, searchTags, searchRecords, searchCelebs } from "@/actions/search";
import { addContent } from "@/actions/contents/addContent";
import { SearchMode, ContentCategory, SEARCH_MODES, CONTENT_CATEGORIES } from "@/components/shared/search/SearchModeDropdown";
import type { SearchResult } from "@/components/shared/search/SearchResultsDropdown";
import { getCategoryById } from "@/constants/categories";
import type { ContentType, ContentStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useQuickRecord } from "@/contexts/QuickRecordContext";
import { SEARCHABLE_CELEB_TIERS } from "@feelandnote/shared/constants/celeb-tiers";

// 마지막으로 고른 검색 종류를 브라우저에 남겨 다음 방문에 되살린다.
const SEARCH_PREF_KEY = "search_pref";

const readRecentSearches = (key: string): string[] => {
  const stored = localStorage.getItem(key);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .slice(0, 10);
    }
  } catch {
    // 손상되었거나 구버전 형식인 저장값은 아래에서 폐기한다.
  }

  localStorage.removeItem(key);
  return [];
};

const categoryToContentType = (category: string): ContentType => {
  const config = getCategoryById(category as ContentCategory);
  return (config?.dbType as ContentType) || "BOOK";
};

export function useHeaderSearch() {
  const t = useTranslations("searchResult");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("celeb");
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

  const restoredRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 지난번 선택 복원 (최초 1회). 검색 페이지는 URL 값이 우선이라 건너뛴다.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (pathname === "/search") return;

    const stored = localStorage.getItem(SEARCH_PREF_KEY);
    if (!stored) return;
    try {
      const pref = JSON.parse(stored) as { mode?: SearchMode; category?: ContentCategory };
      if (pref.mode && SEARCH_MODES.some((m) => m.id === pref.mode)) setMode(pref.mode);
      if (pref.category && CONTENT_CATEGORIES.some((c) => c.id === pref.category)) setContentCategory(pref.category);
    } catch {
      localStorage.removeItem(SEARCH_PREF_KEY);
    }
  }, [pathname]);

  // 선택이 바뀔 때마다 보관
  useEffect(() => {
    if (!restoredRef.current) return;
    localStorage.setItem(SEARCH_PREF_KEY, JSON.stringify({ mode, category: contentCategory }));
  }, [mode, contentCategory]);

  // 검색 페이지에서 URL 파라미터와 동기화
  useEffect(() => {
    if (pathname !== "/search") return;

    const urlMode = searchParams.get("mode") as SearchMode;
    const urlCategory = searchParams.get("category") as ContentCategory;

    if (urlMode && SEARCH_MODES.some((m) => m.id === urlMode)) {
      setMode(urlMode);
    }
    if (urlCategory && CONTENT_CATEGORIES.some((c) => c.id === urlCategory)) {
      setContentCategory(urlCategory);
    }
  }, [pathname, searchParams]);

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
    setRecentSearches(readRecentSearches(key));
  }, [mode, contentCategory]);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    const key = mode === "content" ? `search_recent_${mode}_${contentCategory}` : `search_recent_${mode}`;
    let searches = readRecentSearches(key);
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
              description: item.description, releaseDate: item.releaseDate,
              externalSource: item.externalSource, metadata: item.metadata,
            });
          });
        } else if (mode === "user") {
          const data = await searchUsers({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id, type: "user", title: item.nickname, subtitle: item.username,
              thumbnail: item.avatarUrl,
              extra: t("followers", { count: item.followerCount >= 1000 ? `${(item.followerCount / 1000).toFixed(1)}K` : String(item.followerCount) }),
            });
          });
        } else if (mode === "tag") {
          const data = await searchTags({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.id, type: "tag", title: `#${item.name}`, extra: t("posts", { count: item.postCount.toLocaleString() }),
            });
          });
        } else if (mode === "celeb") {
          const data = await searchCelebs({ query, limit: 5 });
          data.items.forEach((item) => {
            searchResults.push({
              id: item.slug || item.id, type: "celeb", title: item.nickname,
              subtitle: item.title || undefined,
              thumbnail: item.avatar_url || undefined,
              extra: item.profession || undefined,
            });
          });
        } else if (mode === "records") {
          const data = await searchRecords({ query, limit: 5 });
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
        setIsOpen(true);
        // 상태 업데이트 후 포커스 설정
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  // #endregion

  // #region Click Outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // 데스크톱 인라인 검색창과 모바일 전체화면 검색창을 모두 내부로 인정한다.
      // 모바일 쪽을 빠뜨리면 mousedown 시점에 목록이 닫혀 click이 도달하지 못한다.
      if (containerRef.current?.contains(target)) return;
      if (mobileContainerRef.current?.contains(target)) return;
      setIsOpen(false);
      setIsModeOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // #endregion

  // #region Handlers
  const handleSearch = () => {
    if (!query.trim()) return;
    saveRecentSearch(query.trim());

    // 내 기록 검색: 사용자의 records 페이지로 이동
    if (mode === "records") {
      if (!currentUserId) return;
      router.push(`/${currentUserId}/reading?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      return;
    }

    // 셀럽 검색: 탐색 페이지로 이동
    if (mode === "celeb") {
      router.push(
        `/explore/figures?search=${encodeURIComponent(query.trim())}&tier=${SEARCHABLE_CELEB_TIERS.join(",")}`
      );
      setIsOpen(false);
      return;
    }

    const categoryParam = mode === "content" ? `&category=${contentCategory}` : "";
    router.push(`/search?mode=${mode}${categoryParam}&q=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query.trim());
    if (result.type === "content") {
      const category = result.category || "book";
      router.push(`/content/${result.id}?category=${category}`);
    } else if (result.type === "celeb") {
      router.push(`/celeb/${result.id}`);
    } else if (result.type === "user") {
      router.push(`/${result.id}`);
    } else if (result.type === "tag") {
      router.push(`/search?mode=tag&q=${encodeURIComponent(result.title.replace("#", ""))}`);
    }
    setIsOpen(false);
  };

  const { openQuickRecord } = useQuickRecord();

  const handleAddContent = (result: SearchResult) => {
    if (addingIds.has(result.id) || addedIds.has(result.id)) return;
    setAddingIds((prev) => new Set(prev).add(result.id));

    startTransition(async () => {
      try {
        const addResult = await addContent({
          id: result.id,
          type: categoryToContentType(result.category || "book"),
          title: result.title,
          creator: result.subtitle,
          thumbnailUrl: result.thumbnail,
          description: result.description,
          releaseDate: result.releaseDate,
          metadata: result.metadata,
          subtype: result.subtype,
          externalSource: result.externalSource,
        });
        
        if (addResult.success) {
            setAddedIds((prev) => new Set(prev).add(result.id));
            
            // 빠른 기록 패널 열기
            openQuickRecord({
                id: addResult.data.userContentId, // member_contents.id 사용
                type: categoryToContentType(result.category || "book"),
                title: result.title,
                thumbnailUrl: result.thumbnail,
                creator: result.subtitle,
            });
        }
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
    const category = result.category || "book";
    window.open(`/content/${result.id}?category=${category}`, "_blank");
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
    }
    // 태그 검색 비활성화
    // else if (e.key === "#" && query === "") {
    //   e.preventDefault();
    //   setMode("tag");
    // }
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
    containerRef, mobileContainerRef, inputRef,
    // State
    isOpen, setIsOpen, isModeOpen, setIsModeOpen,
    mode, contentCategory, query, setQuery,
    results, recentSearches, isLoading, selectedIndex, setSelectedIndex,
    addingIds, addedIds,
    // Handlers
    handleSearch, handleResultClick, handleAddContent, handleOpenInNewTab,
    handleInputKeyDown, handleModeChange, handleCategoryChange, clearRecentSearches,
  };
}
