"use client";

import { BustIcon as UserXIcon } from "@/components/ui/icons/neo-pantheon";
import { Pagination } from "@/components/ui";
import NeoCelebCard from "./neo-celeb-card";
import CelebFiltersDesktop from "./CelebFiltersDesktop";
import CelebFiltersMobile from "./CelebFiltersMobile";
import { useCelebFilters, getRankVariant } from "./useCelebFilters";
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
      {/* 모바일 그리드 */}
      <div className={`grid grid-cols-2 gap-x-2 gap-y-6 md:hidden ${loadingClass}`}>
        {celebs.map((celeb) => (
          <div key={celeb.id} className="flex justify-center">
            <NeoCelebCard celeb={celeb} variant={getRankVariant(celeb.influence?.rank)} size="small" />
          </div>
        ))}
      </div>

      {/* PC - flex wrap + 고정 너비 래퍼로 일정한 간격 보장 */}
      <div className={`hidden md:flex flex-wrap justify-center gap-x-4 gap-y-10 ${loadingClass}`}>
        {celebs.map((celeb) => (
          <div key={celeb.id} className="w-[180px] flex justify-center">
            <NeoCelebCard celeb={celeb} variant={getRankVariant(celeb.influence?.rank)} size="small" />
          </div>
        ))}
      </div>
    </>
  );
}

function CarouselMode({ celebs, total }: { celebs: CelebProfile[]; total: number }) {
  if (total === 0) return null;

  const pcCelebs = celebs.slice(0, 24);
  const mobileCelebs = celebs.slice(0, 8);

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 bg-gradient-to-br from-white/[0.03] via-transparent to-accent/[0.02]">
      <NoiseOverlay />
      <TopHighlight />

      {/* 모바일: 가로 스크롤 */}
      <div className="md:hidden flex gap-5 overflow-x-auto scrollbar-hide pb-6 px-2 -mx-2">
        {mobileCelebs.map((celeb) => (
          <MobileCelebItem key={celeb.id} celeb={celeb} />
        ))}
        <MoreLink />
      </div>

      {/* PC - flex wrap + 고정 너비 래퍼로 일정한 간격 보장 */}
      <div className="hidden md:flex flex-wrap justify-center gap-x-4 gap-y-16">
        {pcCelebs.map((celeb) => (
          <div key={celeb.id} className="w-[200px] flex justify-center pt-3">
            <NeoCelebCard celeb={celeb} variant={getRankVariant(celeb.influence?.rank)} size="default" scale={0.75} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileCelebItem({ celeb }: { celeb: CelebProfile }) {
  return (
    <a
      href={`/${celeb.id}`}
      className="flex-shrink-0 w-36 flex flex-col items-center gap-3 p-5 bg-bg-card border-double border-2 border-accent-dim/40 rounded-sm shadow-xl relative overflow-hidden group"
    >
      {/* Decorative Gold Shine */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      
      <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0 border-2 border-accent/20 p-1 relative z-10 shadow-glow-sm">
        <div className="w-full h-full rounded-full overflow-hidden">
          {celeb.avatar_url ? (
            <img src={celeb.avatar_url} alt={celeb.nickname} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary text-2xl bg-bg-main font-cinzel">
              {celeb.nickname[0]}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center w-full relative z-10">
        <p className="font-serif font-black text-sm text-text-primary group-hover:text-accent transition-colors truncate">{celeb.nickname}</p>
        <div className="flex flex-col items-center mt-1.5 gap-0.5">
          <span className="text-[10px] text-accent font-cinzel font-black tracking-[0.2em] uppercase opacity-80">
            {celeb.influence?.rank || "D"} RANK
          </span>
          <p className="text-[10px] text-text-tertiary font-serif">{celeb.content_count || 0} RECORDS</p>
        </div>
      </div>

      {/* Background Ornament */}
      <div className="absolute -bottom-2 -right-2 text-4xl font-cinzel font-black text-white/[0.03] pointer-events-none uppercase">
        {celeb.influence?.rank || "D"}
      </div>
    </a>
  );
}

function MoreLink() {
  return (
    <a
      href="/explore"
      className="flex-shrink-0 w-36 flex flex-col items-center justify-center gap-3 p-5 bg-accent/5 rounded-sm border-dashed border-2 border-accent/20 hover:bg-accent/10 transition-colors"
    >
      <div className="w-12 h-12 rounded-full border border-accent/30 flex items-center justify-center">
        <span className="text-accent text-2xl font-cinzel">→</span>
      </div>
      <span className="text-xs font-serif font-black text-accent tracking-widest uppercase">둘러보기</span>
    </a>
  );
}
// #endregion
