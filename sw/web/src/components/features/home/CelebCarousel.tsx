"use client";

import { Search, X, BarChart3 } from "lucide-react";
import { BustIcon as UserXIcon } from "@/components/ui/icons/neo-pantheon";
import { Pagination } from "@/components/ui";
import ExpandedCelebCard from "./celeb-card-drafts/ExpandedCelebCard";
import CelebFiltersDesktop from "./CelebFiltersDesktop";
import CelebFiltersMobile from "./CelebFiltersMobile";
import TagQuickFilter from "./TagQuickFilter";
import TagCelebShowcase from "./TagCelebShowcase";
import { useCelebFilters } from "./useCelebFilters";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, TagCount } from "@/actions/home";

interface CelebCarouselProps {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  tagCounts: TagCount[];
  hideHeader?: boolean;
  mode?: "grid" | "carousel";
  syncToUrl?: boolean;
  onShowInfluenceDistribution?: () => void;
}

export default function CelebCarousel({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  tagCounts,
  mode = "grid",
  syncToUrl = false,
  onShowInfluenceDistribution,
}: CelebCarouselProps) {
  const filters = useCelebFilters({
    initialCelebs,
    initialTotal,
    initialTotalPages,
    professionCounts,
    nationalityCounts,
    contentTypeCounts,
    tagCounts,
    syncToUrl,
  });

  // 캐러셀 모드
  if (mode === "carousel") {
    return <CarouselMode celebs={filters.celebs} total={initialTotal} />;
  }

  // 초기 데이터 없으면 숨김
  if (initialTotal === 0) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") filters.handleSearchSubmit();
  };

  return (
    <div className="space-y-4">
      {/* 1. 컬렉션 (태그 퀵필터) - 중앙정렬 */}
      <div className="flex justify-center">
        <TagQuickFilter
          tags={tagCounts}
          currentTagId={filters.tagId}
          onTagSelect={filters.handleTagChange}
          isLoading={filters.isLoading}
        />
      </div>

      {/* 2. 직군/국적/콘텐츠/정렬 필터 */}
      <CelebFiltersDesktop
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
        onProfessionChange={filters.handleProfessionChange}
        onNationalityChange={filters.handleNationalityChange}
        onContentTypeChange={filters.handleContentTypeChange}
        onSortChange={filters.handleSortChange}
        onSearchInput={() => {}}
        onSearchSubmit={() => {}}
        onSearchClear={() => {}}
        hideSearch
      />

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
        onProfessionChange={filters.handleProfessionChange}
        onNationalityChange={filters.handleNationalityChange}
        onContentTypeChange={filters.handleContentTypeChange}
        onSortChange={filters.handleSortChange}
        onSearchInput={filters.handleSearchInput}
        onSearchSubmit={filters.handleSearchSubmit}
        onSearchClear={filters.handleSearchClear}
      />

      {/* 3. 인물검색 + 영향력분포 - 중앙정렬 */}
      <div className="hidden md:flex items-center justify-center gap-2">
        {/* 검색 입력 */}
        <div className="relative w-64">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => filters.handleSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="인물 검색..."
            className="w-full h-9 ps-9 pe-8 bg-bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
          {filters.search && (
            <button
              type="button"
              onClick={filters.handleSearchClear}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
            >
              <X size={14} className="text-text-tertiary" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={filters.handleSearchSubmit}
          disabled={filters.isLoading}
          className="h-9 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg"
        >
          검색
        </button>

        {/* 영향력 분포 버튼 */}
        {onShowInfluenceDistribution && (
          <button
            type="button"
            onClick={onShowInfluenceDistribution}
            className="flex items-center gap-2 h-9 px-3 text-sm text-text-secondary hover:text-accent bg-bg-card hover:bg-bg-card/80 border border-border/50 rounded-lg"
          >
            <BarChart3 size={16} />
            <span>영향력 분포</span>
          </button>
        )}
      </div>

      {/* 셀럽 그리드 영역 */}
      <section className="relative">
        {/* 빈 상태 */}
        {filters.celebs.length === 0 && !filters.isLoading && <EmptyState />}

        {/* 태그 선택 시 포트레잇 쇼케이스 */}
        {filters.celebs.length > 0 && filters.tagId && filters.activeLabels.tag && (
          <TagCelebShowcase
            celebs={filters.celebs}
            tag={filters.activeLabels.tag}
            isLoading={filters.isLoading}
            currentPage={filters.currentPage}
            totalPages={filters.totalPages}
            onPageChange={filters.handlePageChange}
          />
        )}

        {/* 일반 셀럽 그리드 (태그 미선택 시) */}
        {filters.celebs.length > 0 && !filters.tagId && (
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
  const mobileCelebs = celebs.slice(0, 5); // 5개만 노출 (마지막은 MoreLink)

  return (
    <div className="relative">
      {/* 모바일: 정적 그리드 (배경 박스 없이 깔끔하게, 좌우 여백 정밀 조정) */}
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
