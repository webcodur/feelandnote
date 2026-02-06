"use client";

import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { BustIcon as UserXIcon } from "@/components/ui/icons/neo-pantheon";
import { Pagination } from "@/components/ui";
import CelebCard from "@/components/shared/CelebCard";
import CelebDetailModal from "./celeb-card-drafts/CelebDetailModal";
import CelebFiltersDesktop from "./CelebFiltersDesktop";
import CelebFiltersMobile from "./CelebFiltersMobile";
import ControlPanel from "@/components/shared/ControlPanel";
import { useCelebFilters } from "./useCelebFilters";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts } from "@/actions/home";

interface CelebCarouselProps {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
  hideHeader?: boolean;
  mode?: "grid" | "carousel";
  syncToUrl?: boolean;
  extraButtons?: React.ReactNode;
  onFilterInteraction?: () => void;
  customContent?: React.ReactNode;
  includeInactive?: boolean;
  onIncludeInactiveChange?: (value: boolean) => void;
}

export default function CelebCarousel({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
  mode = "grid",
  syncToUrl = false,
  extraButtons,
  onFilterInteraction,
  customContent,
  includeInactive = false,
  onIncludeInactiveChange,
}: CelebCarouselProps) {
  const filters = useCelebFilters({
    initialCelebs,
    initialTotal,
    initialTotalPages,
    professionCounts,
    nationalityCounts,
    contentTypeCounts,
    genderCounts,
    syncToUrl,
    includeInactive,
    onIncludeInactiveChange,
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
      <div className="hidden md:flex justify-center my-12">
        <ControlPanel
          title="탐색 제어"
          icon={<SlidersHorizontal size={16} className="text-accent/70" />}
          isExpanded={isControlsExpanded}
          onToggleExpand={() => setIsControlsExpanded(!isControlsExpanded)}
          className="w-full max-w-2xl"
        >
          <div className="bg-black/20">
            {/* 1행: 정렬/필터 */}
            <CelebFiltersDesktop
              wrapperClassName="flex items-center justify-center gap-2 px-6 py-4 min-h-[4.5rem]"
              profession={filters.profession}
              nationality={filters.nationality}
              contentType={filters.contentType}
              gender={filters.gender}
              sortBy={filters.sortBy}
              search=""
              professionCounts={professionCounts}
              nationalityCounts={nationalityCounts}
              contentTypeCounts={contentTypeCounts}
              genderCounts={genderCounts}
              isLoading={filters.isLoading}
              activeLabels={filters.activeLabels}
              onProfessionChange={withInteraction(filters.handleProfessionChange)}
              onNationalityChange={withInteraction(filters.handleNationalityChange)}
              onContentTypeChange={withInteraction(filters.handleContentTypeChange)}
              onGenderChange={withInteraction(filters.handleGenderChange)}
              onSortChange={withInteraction(filters.handleSortChange)}
              onSearchInput={() => {}}
              onSearchSubmit={() => {}}
              onSearchClear={() => {}}
              hideSearch
            />

            {/* 2행: 검색/액션 */}
            <div className="flex items-center gap-2 px-6 py-3">
              <div className="relative flex-1 min-w-0 group/search">
                <div className="absolute inset-0 bg-accent/5 blur-sm opacity-0 group-focus-within/search:opacity-100 transition-opacity rounded-md pointer-events-none" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => filters.handleSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="인물 검색..."
                  className="w-full min-w-0 h-9 ps-3 pe-9 bg-black/40 border border-white/10 rounded-md text-sm text-text-primary placeholder:text-text-tertiary/70 focus:outline-none focus:border-accent/40 focus:bg-black/60 transition-all font-sans relative z-10"
                />
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => { onFilterInteraction?.(); filters.handleSearchClear(); }}
                    className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-text-tertiary hover:text-text-primary transition-colors z-20"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { onFilterInteraction?.(); filters.handleSearchSubmit(); }}
                disabled={filters.isLoading}
                className="h-9 w-9 flex items-center justify-center bg-accent/10 hover:bg-accent/20 border border-accent/30 hover:border-accent/60 disabled:opacity-50 text-accent rounded-md transition-all duration-300"
              >
                <Search size={16} />
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              {extraButtons}
            </div>
          </div>
        </ControlPanel>
      </div>

      {/* 셀럽 컨트롤 (Mobile) */}
      <CelebFiltersMobile
        profession={filters.profession}
        nationality={filters.nationality}
        contentType={filters.contentType}
        gender={filters.gender}
        sortBy={filters.sortBy}
        search={filters.search}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        genderCounts={genderCounts}
        isLoading={filters.isLoading}
        activeFilter={filters.activeFilter}
        activeLabels={filters.activeLabels}
        onFilterOpen={filters.setActiveFilter}
        onFilterClose={() => filters.setActiveFilter(null)}
        onProfessionChange={withInteraction(filters.handleProfessionChange)}
        onNationalityChange={withInteraction(filters.handleNationalityChange)}
        onContentTypeChange={withInteraction(filters.handleContentTypeChange)}
        onGenderChange={withInteraction(filters.handleGenderChange)}
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
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 md:gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-[13/19] bg-bg-card animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
// #endregion

function CelebGrid({ celebs, isLoading }: { celebs: CelebProfile[]; isLoading: boolean }) {
  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const [modalIndex, setModalIndex] = useState(-1);
  const loadingClass = isLoading ? "opacity-50 pointer-events-none" : "";

  const handleOpenModal = (celeb: CelebProfile, index: number) => {
    setModalCeleb(celeb);
    setModalIndex(index);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    const idx = direction === "prev" ? modalIndex - 1 : modalIndex + 1;
    if (idx >= 0 && idx < celebs.length) { setModalIndex(idx); setModalCeleb(celebs[idx]); }
  };

  return (
    <>
      <div className={`grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 md:gap-6 ${loadingClass}`}>
        {celebs.map((celeb, idx) => (
          <CelebCard
            key={celeb.id}
            id={celeb.id}
            nickname={celeb.nickname}
            avatar_url={celeb.avatar_url}
            title={celeb.title}
            count={celeb.content_count}
            celebProfile={celeb}
            onOpenModal={handleOpenModal}
            index={idx}
          />
        ))}
      </div>
      {modalCeleb && (
        <CelebDetailModal
          celeb={modalCeleb}
          isOpen={!!modalCeleb}
          onClose={() => { setModalCeleb(null); setModalIndex(-1); }}
          onNavigate={handleNavigate}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < celebs.length - 1}
        />
      )}
    </>
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
          <CelebCard
            key={celeb.id}
            id={celeb.id}
            nickname={celeb.nickname}
            avatar_url={celeb.avatar_url}
            title={celeb.title}
            count={celeb.content_count}
            celebProfile={celeb}
          />
        ))}
        <MoreLink />
      </div>

      {/* PC: Grid */}
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
        {pcCelebs.map((celeb) => (
          <CelebCard
            key={celeb.id}
            id={celeb.id}
            nickname={celeb.nickname}
            avatar_url={celeb.avatar_url}
            title={celeb.title}
            count={celeb.content_count}
            celebProfile={celeb}
          />
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
