"use client";

import { useState } from "react";
import { Search, X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { BustIcon as UserXIcon } from "@/components/ui/icons/neo-pantheon";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui";
import ExpandedCelebCard from "./celeb-card-drafts/ExpandedCelebCard";
import CelebFiltersDesktop from "./CelebFiltersDesktop";
import CelebFiltersMobile from "./CelebFiltersMobile";
import { useCelebFilters } from "./useCelebFilters";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts } from "@/actions/home";

interface CelebCarouselProps {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  hideHeader?: boolean;
  mode?: "grid" | "carousel";
  syncToUrl?: boolean;
  extraButtons?: React.ReactNode;
  onFilterInteraction?: () => void;
  customContent?: React.ReactNode;
}

export default function CelebCarousel({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  mode = "grid",
  syncToUrl = false,
  extraButtons,
  onFilterInteraction,
  customContent,
}: CelebCarouselProps) {
  const filters = useCelebFilters({
    initialCelebs,
    initialTotal,
    initialTotalPages,
    professionCounts,
    nationalityCounts,
    contentTypeCounts,
    syncToUrl,
  });

  const [isControlsExpanded, setIsControlsExpanded] = useState(true);

  // 캐러셀 모드
  if (mode === "carousel") {
    return <CarouselMode celebs={filters.celebs} total={initialTotal} />;
  }

  // 초기 데이터 없으면 숨김
  if (initialTotal === 0) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onFilterInteraction?.();
      filters.handleSearchSubmit();
    }
  };

  // 필터 인터랙션 래퍼
  const withInteraction = <T,>(handler: (v: T) => void) => (value: T) => {
    onFilterInteraction?.();
    handler(value);
  };

  return (
    <div>
      {/* 셀럽 컨트롤 (PC) */}
      <div className="hidden md:flex justify-center mb-10">
        <div className="inline-grid border border-white/20 rounded-xl overflow-hidden">
          {/* 타이틀 바 (클릭하면 접기/펼치기) */}
          <button
            type="button"
            onClick={() => setIsControlsExpanded(!isControlsExpanded)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <SlidersHorizontal size={14} className="text-text-secondary" />
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Control Panel</span>
            <ChevronDown
              size={14}
              className={cn(
                "text-text-tertiary transition-transform duration-200",
                isControlsExpanded && "rotate-180"
              )}
            />
          </button>

          {/* 접히는 영역 */}
          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            isControlsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              {/* 1행: 정렬/필터 */}
              <CelebFiltersDesktop
                wrapperClassName="flex items-center justify-center gap-3 px-4 min-h-[4.25rem]"
            profession={filters.profession}
            nationality={filters.nationality}
            contentType={filters.contentType}
            sortBy={filters.sortBy}
            search=""
            professionCounts={professionCounts}
            nationalityCounts={nationalityCounts}
            contentTypeCounts={contentTypeCounts}
            isLoading={filters.isLoading}
            activeLabels={filters.activeLabels}
            onProfessionChange={withInteraction(filters.handleProfessionChange)}
            onNationalityChange={withInteraction(filters.handleNationalityChange)}
            onContentTypeChange={withInteraction(filters.handleContentTypeChange)}
            onSortChange={withInteraction(filters.handleSortChange)}
            onSearchInput={() => {}}
            onSearchSubmit={() => {}}
            onSearchClear={() => {}}
            hideSearch
          />
          {/* 구분선 */}
          <div className="h-px bg-accent/10" />
          {/* 2행: 검색/액션 */}
          <div className="flex items-center gap-3 px-4 min-h-[4.25rem] rounded-b-xl">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => filters.handleSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="인물 검색..."
                className="w-full min-w-0 h-10 ps-9 pe-8 bg-white/5 border border-accent/25 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => { onFilterInteraction?.(); filters.handleSearchClear(); }}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                >
                  <X size={14} className="text-text-tertiary" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => { onFilterInteraction?.(); filters.handleSearchSubmit(); }}
              disabled={filters.isLoading}
              className="h-10 px-4 bg-white/5 border border-accent/25 hover:border-accent/50 disabled:opacity-50 text-text-primary text-sm font-medium rounded-lg shrink-0"
            >
              검색
            </button>
            {extraButtons}
          </div>
            </div>
          </div>
        </div>
      </div>

      {/* 셀럽 컨트롤 (Mobile) */}
      <CelebFiltersMobile
        profession={filters.profession}
        nationality={filters.nationality}
        contentType={filters.contentType}
        sortBy={filters.sortBy}
        search={filters.search}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        isLoading={filters.isLoading}
        activeFilter={filters.activeFilter}
        activeLabels={filters.activeLabels}
        onFilterOpen={filters.setActiveFilter}
        onFilterClose={() => filters.setActiveFilter(null)}
        onProfessionChange={withInteraction(filters.handleProfessionChange)}
        onNationalityChange={withInteraction(filters.handleNationalityChange)}
        onContentTypeChange={withInteraction(filters.handleContentTypeChange)}
        onSortChange={withInteraction(filters.handleSortChange)}
        onSearchInput={(v) => { onFilterInteraction?.(); filters.handleSearchInput(v); }}
        onSearchSubmit={() => { onFilterInteraction?.(); filters.handleSearchSubmit(); }}
        onSearchClear={() => { onFilterInteraction?.(); filters.handleSearchClear(); }}
        extraButtons={extraButtons}
        isExpanded={isControlsExpanded}
        onToggleExpand={() => setIsControlsExpanded(!isControlsExpanded)}
      />

      {/* 커스텀 컨텐츠 또는 셀럽 그리드 영역 */}
      {customContent ? (
        <div key="custom" className="animate-fade-in">
          {customContent}
        </div>
      ) : (
        <section key="grid" className="relative animate-fade-in">
          {filters.celebs.length === 0 && !filters.isLoading && <EmptyState />}
          {filters.isLoading && filters.celebs.length === 0 && <GridSkeleton />}
          {filters.celebs.length > 0 && (
            <>
              <CelebGrid celebs={filters.celebs} isLoading={filters.isLoading} />
              <div className="mt-8">
                <Pagination
                  currentPage={filters.currentPage}
                  totalPages={filters.totalPages}
                  onPageChange={filters.handlePageChange}
                />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

// #region 하위 컴포넌트 (Helper Components)
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <UserXIcon size={32} className="text-text-tertiary" />
      </div>
      <p className="text-sm text-text-secondary text-center">해당 직군의 셀럽이 없습니다</p>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-[13/19] bg-bg-card animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
// #endregion

function CelebGrid({ celebs, isLoading }: { celebs: CelebProfile[]; isLoading: boolean }) {
  const loadingClass = isLoading ? "opacity-50 pointer-events-none" : "";

  return (
    <div className={`grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-6 ${loadingClass}`}>
      {celebs.map((celeb) => (
        <ExpandedCelebCard key={celeb.id} celeb={celeb} />
      ))}
    </div>
  );
}

function CarouselMode({ celebs, total }: { celebs: CelebProfile[]; total: number }) {
  if (total === 0) return null;

  const pcCelebs = celebs.slice(0, 12);
  const mobileCelebs = celebs.slice(0, 5);

  return (
    <div className="relative">
      {/* 모바일: 정적 그리드 */}
      <div className="md:hidden grid grid-cols-3 gap-2 px-0.5">
        {mobileCelebs.map((celeb) => (
          <ExpandedCelebCard key={celeb.id} celeb={celeb} />
        ))}
        <MoreLink />
      </div>

      {/* PC: Grid */}
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {pcCelebs.map((celeb) => (
          <ExpandedCelebCard key={celeb.id} celeb={celeb} />
        ))}
      </div>
    </div>
  );
}

function MoreLink() {
  return (
    <a
      href="/explore"
      className="group flex flex-col items-center justify-center gap-2 bg-accent/5 border-dashed border-2 border-accent/20 hover:bg-accent/10 rounded-sm aspect-[13/19] w-full transition-colors"
    >
      <div className="w-8 h-8 rounded-full border border-accent/30 flex items-center justify-center group-hover:scale-110 transition-transform">
        <span className="text-accent text-lg">→</span>
      </div>
      <span className="text-[9px] font-bold text-accent tracking-widest uppercase">MORE</span>
    </a>
  );
}
// #endregion
