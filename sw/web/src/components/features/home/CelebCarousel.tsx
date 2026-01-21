"use client";

import { BustIcon as UserXIcon } from "@/components/ui/icons/neo-pantheon";
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
}

export default function CelebCarousel({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  mode = "grid",
}: CelebCarouselProps) {
  const filters = useCelebFilters({
    initialCelebs,
    initialTotal,
    initialTotalPages,
    professionCounts,
    nationalityCounts,
    contentTypeCounts,
  });

  // 캐러셀 모드
  if (mode === "carousel") {
    return <CarouselMode celebs={filters.celebs} total={initialTotal} />;
  }

  // 초기 데이터 없으면 숨김
  if (initialTotal === 0) return null;

  return (
    <div className="space-y-4">
      {/* 필터/정렬 - 캐러셀 상단 */}
      <CelebFiltersDesktop
        profession={filters.profession}
        nationality={filters.nationality}
        contentType={filters.contentType}
        sortBy={filters.sortBy}
        search={filters.search}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        isLoading={filters.isLoading}
        activeLabels={filters.activeLabels}
        onProfessionChange={filters.handleProfessionChange}
        onNationalityChange={filters.handleNationalityChange}
        onContentTypeChange={filters.handleContentTypeChange}
        onSortChange={filters.handleSortChange}
        onSearchInput={filters.handleSearchInput}
        onSearchSubmit={filters.handleSearchSubmit}
        onSearchClear={filters.handleSearchClear}
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

      {/* 셀럽 그리드 영역 - 배경 박스 제거하여 클린하게 변경 */}
      <section className="relative">
        {/* 빈 상태 */}
        {filters.celebs.length === 0 && !filters.isLoading && <EmptyState />}

        {/* 셀럽 그리드 */}
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
