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
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        isLoading={filters.isLoading}
        activeLabels={filters.activeLabels}
        onProfessionChange={filters.handleProfessionChange}
        onNationalityChange={filters.handleNationalityChange}
        onContentTypeChange={filters.handleContentTypeChange}
        onSortChange={filters.handleSortChange}
      />

      <CelebFiltersMobile
        profession={filters.profession}
        nationality={filters.nationality}
        contentType={filters.contentType}
        sortBy={filters.sortBy}
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
      />

      {/* 셀럽 그리드 영역 */}
      <section className="relative overflow-hidden rounded-2xl p-4 md:p-6 bg-gradient-to-br from-white/[0.03] via-transparent to-accent/[0.02]">
        <NoiseOverlay />
        <TopHighlight />

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

// #region 하위 컴포넌트
function NoiseOverlay() {
  return (
    <div
      className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay"
      style={{
        backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")`,
        backgroundSize: "200px 200px",
      }}
    />
  );
}

function TopHighlight() {
  return (
    <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  );
}

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

function CelebGrid({ celebs, isLoading }: { celebs: CelebProfile[]; isLoading: boolean }) {
  const loadingClass = isLoading ? "opacity-50 pointer-events-none" : "";

  return (
    <>
      {/* 모바일: 1열 중앙 정렬 (260px 카드) */}
      <div className={`flex flex-col items-center gap-6 md:hidden ${loadingClass}`}>
        {celebs.map((celeb) => (
          <ExpandedCelebCard key={celeb.id} celeb={celeb} />
        ))}
      </div>

      {/* PC: flex wrap (260px 카드 기준) */}
      <div className={`hidden md:flex flex-wrap justify-center gap-6 ${loadingClass}`}>
        {celebs.map((celeb) => (
          <ExpandedCelebCard key={celeb.id} celeb={celeb} />
        ))}
      </div>
    </>
  );
}

function CarouselMode({ celebs, total }: { celebs: CelebProfile[]; total: number }) {
  if (total === 0) return null;

  const pcCelebs = celebs.slice(0, 12);
  const mobileCelebs = celebs.slice(0, 6);

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 bg-gradient-to-br from-white/[0.03] via-transparent to-accent/[0.02]">
      <NoiseOverlay />
      <TopHighlight />

      {/* 모바일: 가로 스크롤 */}
      <div className="md:hidden flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2 -mx-2">
        {mobileCelebs.map((celeb) => (
          <div key={celeb.id} className="flex-shrink-0">
            <ExpandedCelebCard celeb={celeb} className="w-[200px] h-[290px]" />
          </div>
        ))}
        <MoreLink />
      </div>

      {/* PC: flex wrap */}
      <div className="hidden md:flex flex-wrap justify-center gap-6">
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
      className="flex-shrink-0 w-[200px] h-[290px] flex flex-col items-center justify-center gap-4 bg-accent/5 border-dashed border-2 border-accent/20 hover:bg-accent/10"
    >
      <div className="w-14 h-14 rounded-full border border-accent/30 flex items-center justify-center">
        <span className="text-accent text-3xl">→</span>
      </div>
      <span className="text-sm font-bold text-accent tracking-widest uppercase">더보기</span>
    </a>
  );
}
// #endregion
