/*
  파일명: /components/features/search/SearchResultsDropdown.tsx
  기능: 헤더 검색창 결과 드롭다운
  책임: 검색 중 실시간 결과 미리보기 및 최근 검색 표시
*/ // ------------------------------
"use client";

import { useState } from "react";
import ContentImage from "@/components/ui/ContentImage";
import { Search, Clock, Hash, Book, Film, Tv, Gamepad2, Music, ExternalLink, Loader2, User, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import AddContentPopover from "@/components/shared/content/AddContentPopover";
import CelebDetailCardButton from "@/components/shared/CelebDetailCardButton";
import PersonNameplate from "@/components/features/user/explore/PersonNameplate";
import { Link } from "@/i18n/navigation";
import { Z_INDEX } from "@/constants/zIndex";
import { useTranslations } from "next-intl";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  book: Book,
  movie: Film,
  drama: Tv,
  animation: Music,
  game: Gamepad2,
};

const CELEB_SEARCH_ACTION_CLASS =
  "inline-flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-md border border-white/15 bg-black/60 text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 md:h-11 md:w-11";

export interface SearchResult {
  id: string;
  type: "content" | "user" | "tag" | "celeb";
  slug?: string;
  title: string;
  subtitle?: string;
  category?: string;
  subtype?: string;
  extra?: string;
  thumbnail?: string;
  description?: string;
  releaseDate?: string;
  externalSource?: string;
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
  onCelebLinkClick?: (result: SearchResult) => void;
  onCelebInfoClick?: (result: SearchResult) => void;
  celebInfoLoadingId?: string | null;
  /** @deprecated status 파라미터는 무시됨 */
  onAddContent?: (result: SearchResult) => void;
  onOpenInNewTab?: (result: SearchResult) => void;
  isMobile?: boolean;
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
  onCelebLinkClick,
  onCelebInfoClick,
  celebInfoLoadingId,
  onAddContent,
  onOpenInNewTab,
  isMobile = false,
}: SearchResultsDropdownProps) {
  const t = useTranslations("shared.search");
  // 콘텐츠 검색 모드이고 archive 모드가 아닐 때만 유틸 버튼 표시
  const showContentUtils = searchMode === "content";

  const containerClass = isMobile
    ? "bg-bg-card border border-border rounded-xl overflow-hidden max-h-[calc(100vh-80px)] overflow-y-auto"
    : "absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-accent/20 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.7)] overflow-hidden max-h-[400px] overflow-y-auto";

  return (
    <div className={containerClass} style={isMobile ? undefined : { zIndex: Z_INDEX.dropdown }}>
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
          {searchMode !== "celeb" && (
            <Button
              unstyled
              onClick={onViewAllResults}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm text-accent font-medium hover:bg-accent/10 border-b border-white/5 transition-colors"
            >
              <Search size={16} />
              {t("viewAllResults")}
            </Button>
          )}

          {results.map((result, index) => {
            // 사용자 결과: FriendCardNameplate 사용
            if (result.type === "user") {
              return (
                <div
                  key={result.id}
                  className={`px-2 py-1 ${selectedIndex === index ? "bg-accent/10" : ""}`}
                >
                  <PersonNameplate
                    person={{
                      id: result.id,
                      nickname: result.title,
                      avatar_url: result.thumbnail || null,
                      content_count: 0,
                    }}
                    onClick={() => onResultClick(result)}
                  />
                </div>
              );
            }

            // 셀럽 결과
            if (result.type === "celeb") {
              return (
                <CelebSearchResult
                  key={result.id}
                  result={result}
                  isSelected={selectedIndex === index}
                  onLinkClick={onCelebLinkClick}
                  onInfoClick={onCelebInfoClick}
                  isInfoLoading={celebInfoLoadingId === result.id}
                />
              );
            }

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
                    <div className="relative w-10 h-14 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {result.thumbnail ? (
                        <ContentImage
                          src={result.thumbnail}
                          alt={result.title}
                          sizes="40px"
                        />
                      ) : CategoryIcon ? (
                        <CategoryIcon size={16} className="text-text-secondary" />
                      ) : null}
                    </div>
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
                    {onAddContent && (
                      <div className={isAdded ? "" : "hidden group-hover:block"}>
                        <AddContentPopover
                          onAdd={() => onAddContent(result)}
                          isAdding={isAdding}
                          isAdded={isAdded}
                          size="md"
                        />
                      </div>
                    )}
                    {onOpenInNewTab && (
                      <Button
                        unstyled
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInNewTab(result);
                        }}
                        className="p-1.5 rounded-md bg-white/10 text-text-secondary hover:bg-white/20 hover:text-text-primary hidden group-hover:block"
                        title={t("openInNewTab")}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {searchMode === "celeb" && (
            <Button
              unstyled
              onClick={onViewAllResults}
              className="flex w-full items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-sm font-medium text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {t("showMore")}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          )}
        </>
      )}

      {/* Recent Searches (when no query) */}
      {!isLoading && !query && recentSearches.length > 0 && (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-xs text-text-secondary font-medium">{t("recentSearches")}</span>
            <Button
              unstyled
              onClick={onClearRecentSearches}
              className="text-xs text-text-secondary hover:text-accent"
            >
              {t("clear")}
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
          <p className="text-sm text-text-secondary">{t("noResults", { query })}</p>
        </div>
      )}

      {/* Initial state hint */}
      {!isLoading && !query && recentSearches.length === 0 && (
        <div className="py-6 px-4 text-center">
          <p className="text-sm text-text-secondary mb-2">{t("enterQuery")}</p>
          <div className="flex items-center justify-center gap-4 text-xs text-text-secondary">
            <span><kbd className="px-1 bg-white/5 rounded">@</kbd> {t("hintUser")}</span>
            <span><kbd className="px-1 bg-white/5 rounded">#</kbd> {t("hintTag")}</span>
            <span><kbd className="px-1 bg-white/5 rounded">Tab</kbd> {t("hintMode")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface CelebSearchResultProps {
  result: SearchResult;
  isSelected: boolean;
  onLinkClick?: (result: SearchResult) => void;
  onInfoClick?: (result: SearchResult) => void;
  isInfoLoading: boolean;
}

function CelebSearchResult({
  result,
  isSelected,
  onLinkClick,
  onInfoClick,
  isInfoLoading,
}: CelebSearchResultProps) {
  const t = useTranslations("shared.search");
  const tc = useTranslations("shared.celeb");
  const href = `/celeb/${result.slug || result.id}`;
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleInfoClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isInfoLoading) onInfoClick?.(result);
  };

  return (
    <div
      className={`mx-2 my-1 flex h-14 items-stretch gap-2 rounded-lg border px-1.5 md:h-16 ${
        isSelected
          ? "border-accent/40 bg-accent/10"
          : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
      }`}
    >
      <Link
        href={href}
        prefetch={false}
        onClick={() => onLinkClick?.(result)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1.5 text-left hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <div className="relative flex h-full w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5 md:w-16">
          {result.thumbnail && !imageFailed ? (
            <>
              {!imageLoaded && (
                <div
                  className="absolute inset-0 animate-pulse bg-white/[0.08]"
                  aria-hidden="true"
                />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.thumbnail}
                alt={result.title}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageFailed(true);
                  setImageLoaded(false);
                }}
                className={`block h-full w-full object-contain transition-opacity duration-150 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          ) : (
            <User size={20} className="text-text-secondary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text-primary">{result.title}</div>
          {result.subtitle && (
            <div className="truncate text-xs text-text-secondary">{result.subtitle}</div>
          )}
        </div>
      </Link>
      <CelebDetailCardButton
        label={`${result.title} — ${tc("viewCard")}`}
        onClick={handleInfoClick}
        loading={isInfoLoading}
        size="compact"
        iconSize={20}
        className={CELEB_SEARCH_ACTION_CLASS}
      />
      <Link
        href={href}
        prefetch={false}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${result.title} — ${t("openInNewTab")}`}
        title={t("openInNewTab")}
        className={CELEB_SEARCH_ACTION_CLASS}
      >
        <ExternalLink size={20} aria-hidden="true" />
      </Link>
    </div>
  );
}
