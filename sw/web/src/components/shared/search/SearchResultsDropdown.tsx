/*
  파일명: /components/features/search/SearchResultsDropdown.tsx
  기능: 헤더 검색창 결과 드롭다운
  책임: 검색 중 실시간 결과 미리보기 및 최근 검색 표시
*/ // ------------------------------
"use client";

import Image from "next/image";
import { Search, Clock, Hash, Book, Film, Tv, Gamepad2, Music, Award, Loader2, Plus, ExternalLink, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

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
  subtype?: string;
  extra?: string;
  thumbnail?: string;
  description?: string;
  releaseDate?: string;
  metadata?: Record<string, unknown>;
}

interface SearchResultsDropdownProps {
  isLoading: boolean;
  query: string;
  results: SearchResult[];
  recentSearches: string[];
  selectedIndex: number;
  searchMode?: string;
  addingIds?: Set<string>;
  addedIds?: Set<string>;
  onResultClick: (result: SearchResult) => void;
  onRecentSearchClick: (search: string) => void;
  onClearRecentSearches: () => void;
  onViewAllResults: () => void;
  onAddToArchive?: (result: SearchResult) => void;
  onOpenInNewTab?: (result: SearchResult) => void;
}

export default function SearchResultsDropdown({
  isLoading,
  query,
  results,
  recentSearches,
  selectedIndex,
  searchMode = "content",
  addingIds = new Set(),
  addedIds = new Set(),
  onResultClick,
  onRecentSearchClick,
  onClearRecentSearches,
  onViewAllResults,
  onAddToArchive,
  onOpenInNewTab,
}: SearchResultsDropdownProps) {
  // 콘텐츠 검색 모드이고 archive 모드가 아닐 때만 유틸 버튼 표시
  const showContentUtils = searchMode === "content";

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto" style={{ zIndex: Z_INDEX.dropdown }}>
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <>
          {/* View all results - 첫 번째 항목 */}
          <Button
            unstyled
            onClick={onViewAllResults}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-accent hover:bg-accent/5 border-b border-border"
          >
            <Search size={16} />
            전체 검색결과 보기
          </Button>

          {results.map((result, index) => {
            const CategoryIcon = result.category ? CATEGORY_ICONS[result.category] || Book : null;
            const isContentResult = result.type === "content" && showContentUtils;
            const isAdding = addingIds.has(result.id);
            const isAdded = addedIds.has(result.id);

            return (
              <div
                key={result.id}
                className={`flex items-center gap-3 px-4 py-3 group
                  ${selectedIndex === index ? "bg-accent/10" : "hover:bg-white/5"}`}
              >
                {/* 클릭 가능 영역 */}
                <Button
                  unstyled
                  onClick={() => onResultClick(result)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  {result.type === "content" && (
                    <div className="relative w-10 h-14 rounded-md bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {result.thumbnail ? (
                        <Image
                          src={result.thumbnail}
                          alt={result.title}
                          fill
                          unoptimized
                          className="object-cover"
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

                {/* 콘텐츠 유틸 버튼 (추가, 새창 열기) */}
                {isContentResult && (
                  <div className="flex items-center gap-1 shrink-0">
                    {onAddToArchive && (
                      isAdded ? (
                        <div className="p-1.5 rounded-md bg-green-500/20 text-green-400">
                          <Check size={14} />
                        </div>
                      ) : (
                        <Button
                          unstyled
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToArchive(result);
                          }}
                          disabled={isAdding}
                          className={`p-1.5 rounded-md bg-accent/20 text-accent hover:bg-accent/30
                            ${isAdding ? "opacity-50" : "hidden group-hover:block"}`}
                          title="기록관에 추가"
                        >
                          {isAdding && <Loader2 size={14} className="animate-spin" />}
                          {!isAdding && <Plus size={14} />}
                        </Button>
                      )
                    )}
                    {onOpenInNewTab && (
                      <Button
                        unstyled
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInNewTab(result);
                        }}
                        className="p-1.5 rounded-md bg-white/10 text-text-secondary hover:bg-white/20 hover:text-text-primary hidden group-hover:block"
                        title="새 창으로 열기"
                      >
                        <ExternalLink size={14} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
