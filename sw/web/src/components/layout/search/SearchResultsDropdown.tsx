"use client";

import { Search, Clock, Hash, Book, Film, Tv, Gamepad2, Music, Award, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  book: Book,
  movie: Film,
  drama: Tv,
  animation: Music,
  game: Gamepad2,
  certificate: Award,
};

export interface SearchResult {
  id: string;
  type: "content" | "user" | "tag";
  title: string;
  subtitle?: string;
  category?: string;
  extra?: string;
  thumbnail?: string;
  description?: string;
  releaseDate?: string;
}

interface SearchResultsDropdownProps {
  isLoading: boolean;
  query: string;
  results: SearchResult[];
  recentSearches: string[];
  selectedIndex: number;
  onResultClick: (result: SearchResult) => void;
  onRecentSearchClick: (search: string) => void;
  onClearRecentSearches: () => void;
  onViewAllResults: () => void;
}

export default function SearchResultsDropdown({
  isLoading,
  query,
  results,
  recentSearches,
  selectedIndex,
  onResultClick,
  onRecentSearchClick,
  onClearRecentSearches,
  onViewAllResults,
}: SearchResultsDropdownProps) {
  return (
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
              <Button
                unstyled
                key={result.id}
                onClick={() => onResultClick(result)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left
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
              </Button>
            );
          })}

          {/* View all results */}
          <Button
            unstyled
            onClick={onViewAllResults}
            className="w-full px-4 py-3 text-sm text-accent hover:bg-accent/5 border-t border-border"
          >
            "{query}" 검색 결과 더보기 →
          </Button>
        </>
      )}

      {/* Recent Searches (when no query) */}
      {!isLoading && !query && recentSearches.length > 0 && (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-xs text-text-secondary font-medium">최근 검색</span>
            <Button
              unstyled
              onClick={onClearRecentSearches}
              className="text-xs text-text-secondary hover:text-accent"
            >
              지우기
            </Button>
          </div>
          {recentSearches.map((search, index) => (
            <Button
              unstyled
              key={search}
              onClick={() => onRecentSearchClick(search)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left
                ${selectedIndex === index ? "bg-accent/10" : "hover:bg-white/5"}`}
            >
              <Clock size={14} className="text-text-secondary" />
              <span className="text-sm text-text-primary">{search}</span>
            </Button>
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
  );
}
