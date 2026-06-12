/*
  파일명: /app/(standalone)/search/SearchContent.tsx
  기능: 검색 페이지 본문
  책임: 검색 컨트롤·결과 목록·페이지네이션 UI를 렌더링한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { Search, Loader2, ArrowUpDown, Info, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui";
import { FilterChipDropdown } from "@/components/shared/filters";
import Button from "@/components/ui/Button";
import ControlPanel from "@/components/shared/ControlPanel";
import { ContentResults, UserResults, TagResults } from "@/components/shared/search/SearchResultCards";
import { CATEGORIES, type CategoryId } from "@/constants/categories";
import {
  CATEGORY_SEARCH_GUIDE_KEYS,
  API_SOURCE_URL,
  CONTENT_SORT_OPTIONS,
  USER_SORT_OPTIONS,
} from "./searchConfig";
import { useSearch } from "./useSearch";

export default function SearchContent() {
  const t = useTranslations("searchPage");
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);

  const {
    router,
    modeParam,
    queryParam,
    category,
    setCategory,
    sortBy,
    setSortBy,
    isLoading,
    contentResults,
    userResults,
    tagResults,
    totalCount,
    hasMore,
    isLoadingMore,
    savedIds,
    userCounts,
    currentUserId,
    updateUrl,
    loadMore,
    handleBeforeNavigate,
    handleAddContent,
  } = useSearch();

  return (
    <>
      {modeParam === "content" && (
        <div className="mb-6 flex justify-center">
          <ControlPanel
            title={t("control")}
            icon={<SlidersHorizontal size={16} className="text-accent/70" />}
            isExpanded={isControlsExpanded}
            onToggleExpand={() => setIsControlsExpanded(!isControlsExpanded)}
            className="w-full max-w-3xl"
          >
            <div className="bg-black/20">
              {/* 1행: 카테고리 + 정렬 필터 */}
              <div className="flex items-center justify-center gap-2 px-6 py-4">
                {/* 카테고리 필터 */}
                <FilterChipDropdown
                  label={t("category")}
                  value={t(`contentCategory.${category}`)}
                  isActive={category !== "book"}
                  isLoading={isLoading}
                  options={CATEGORIES.map((cat) => ({
                    value: cat.id,
                    label: t(`contentCategory.${cat.id}`),
                  }))}
                  currentValue={category}
                  onSelect={(value) => {
                    setCategory(value as CategoryId);
                    updateUrl(value as CategoryId);
                  }}
                />

                {/* 정렬 필터 */}
                <FilterChipDropdown
                  label={t("sort")}
                  value={t(`contentSort.${CONTENT_SORT_OPTIONS.find((opt) => opt.value === sortBy)?.key ?? "relevance"}`)}
                  isActive={sortBy !== "relevance"}
                  isLoading={isLoading}
                  options={CONTENT_SORT_OPTIONS.map((opt) => ({ value: opt.value, label: t(`contentSort.${opt.key}`) }))}
                  currentValue={sortBy}
                  onSelect={setSortBy}
                  icon={<ArrowUpDown size={14} />}
                />
              </div>

              {/* 2행: API 출처 + 검색 안내 */}
              <div className="flex items-center justify-between gap-4 px-6 py-3 text-xs text-text-tertiary border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <Info size={12} />
                  <span>
                    {t("poweredBy")}{" "}
                    <a
                      href={API_SOURCE_URL[category as Exclude<CategoryId, "all">]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent/60 hover:text-accent underline underline-offset-2 transition-colors"
                    >
                      {t(`apiSource.${category}`)}
                    </a>
                  </span>
                </div>
                {CATEGORY_SEARCH_GUIDE_KEYS[category] && (
                  <span className="text-text-secondary">{t(CATEGORY_SEARCH_GUIDE_KEYS[category] as "guide.game" | "guide.certificate")}</span>
                )}
              </div>
            </div>
          </ControlPanel>
        </div>
      )}

      {modeParam === "user" && (
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer"><input type="checkbox" className="rounded" /> {t("followingOnly")}</label>
          <div className="ml-auto"><FilterSelect options={USER_SORT_OPTIONS.map((opt) => ({ value: opt.value, label: t(`userSort.${opt.key}`) }))} value={sortBy} onChange={setSortBy} icon={ArrowUpDown} /></div>
        </div>
      )}

      {queryParam && !isLoading && (
        <div className="mb-6"><h1 className="text-xl font-bold">"{queryParam}" {t("resultCount", { count: totalCount })}</h1></div>
      )}

      {isLoading && (
        <div className="animate-pulse space-y-4">
          {(modeParam === "content" || modeParam === "records") && (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
              ))}
            </div>
          )}
          {modeParam === "user" && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-bg-card">
                  <div className="w-12 h-12 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-white/5 rounded" />
                    <div className="h-3 w-20 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {modeParam === "tag" && (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-20 bg-bg-card rounded-full" />
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && (modeParam === "content" || modeParam === "records") && (
        <ContentResults
          results={contentResults}
          mode={modeParam}
          currentUserId={currentUserId}
          savedIds={savedIds}
          userCounts={userCounts}
          onBeforeNavigate={handleBeforeNavigate}
          onAddContent={handleAddContent}
        />
      )}
      {!isLoading && modeParam === "user" && (
        <UserResults results={userResults} onItemClick={(u) => router.push(`/${u.id}`)} />
      )}
      {!isLoading && modeParam === "tag" && (
        <TagResults results={tagResults} onItemClick={(t) => router.push(`/feed?tag=${encodeURIComponent(t.name)}`)} />
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
                {t("loading")}
              </span>
            ) : (
              t("loadMore")
            )}
          </Button>
        </div>
      )}

      {/* 모든 결과 로드 완료 */}
      {!isLoading && !hasMore && queryParam && totalCount > 0 && (
        <div className="mt-8 text-center text-sm text-text-secondary">
          {t("allLoaded", { count: contentResults.length || userResults.length || tagResults.length })}
        </div>
      )}

      {!isLoading && queryParam && totalCount === 0 && (
        <div className="py-20 text-center">
          <Search size={48} className="mx-auto text-text-secondary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">{t("noResults", { query: queryParam })}</h2>
          <p className="text-text-secondary">{t("noResultsHint")}</p>
        </div>
      )}

      {!queryParam && (
        <div className="py-20 text-center">
          <Search size={48} className="mx-auto text-text-secondary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">{t("enterQuery")}</h2>
          <p className="text-text-secondary">{t("enterQueryDesc")}</p>
        </div>
      )}
    </>
  );
}
