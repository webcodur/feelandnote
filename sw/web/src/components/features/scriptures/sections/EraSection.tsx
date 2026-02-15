/*
  파일명: /components/features/scriptures/sections/EraSection.tsx
  기능: 불후의 명작 섹션 (통합)
  책임: 전체 시대 + 시대별 인물들의 선택을 보여준다.
*/ // ------------------------------

"use client";

import { useState, useTransition, useMemo } from "react";
import { Scroll } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import RepresentativeCelebs from "../RepresentativeCelebs";
import { getCategoryByDbType } from "@/constants/categories";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import { Pagination } from "@/components/ui/Pagination";
import { DecorativeLabel } from "@/components/ui";
import SectionHeader from "@/components/shared/SectionHeader";
import type { ContentType } from "@/types/database";
import type { EraScriptures, ScripturesResult } from "@/actions/scriptures";
import { getChosenScriptures } from "@/actions/scriptures";

// #region Types
type TabValue = "all" | "contemporary" | "modern" | "medieval" | "ancient";
type CategoryFilter = "ALL" | "BOOK" | "VIDEO" | "GAME" | "MUSIC";

interface TopCeleb {
  id: string;
  nickname: string;
  avatar_url: string | null;
  title: string | null;
  influence: number | null;
  count: number;
}

interface Props {
  initialEraData: EraScriptures[];
  initialChosenData: ScripturesResult;
  topCelebsAcrossAllEras: TopCeleb[];
}

interface ScriptureContent {
  id: string;
  title: string;
  creator: string | null;
  thumbnail_url: string | null;
  type: string;
  celeb_count: number;
  user_count: number;
  avg_rating: number | null;
}
// #endregion

// #region Constants
const ERA_TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "contemporary", label: "현대" },
  { value: "modern", label: "근대" },
  { value: "medieval", label: "중세" },
  { value: "ancient", label: "고대" },
];

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "BOOK", label: "도서" },
  { value: "VIDEO", label: "영상" },
  { value: "GAME", label: "게임" },
  { value: "MUSIC", label: "음악" },
];

const ITEMS_PER_PAGE = 12;

// 탭 버튼 공통 스타일
const TAB_BUTTON_STYLE = "relative px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center leading-tight min-w-[60px]";
const TAB_ACTIVE_STYLE = "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]";
const TAB_INACTIVE_STYLE = "text-text-secondary hover:text-white hover:bg-white/5";
// #endregion

// #region 공통 콘텐츠 섹션
interface ContentSectionProps {
  contents: ScriptureContent[];
  isPending?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  showTop3Effect?: boolean;
}

function ContentSection({
  contents,
  isPending = false,
  page = 1,
  totalPages = 0,
  onPageChange,
  showTop3Effect = false,
}: ContentSectionProps) {
  return (
    <div>
      {/* 작품 라벨 */}
      <div className="mb-4 flex justify-center">
        <DecorativeLabel label="작품 목록" />
      </div>

      {/* 카드 그리드 */}
      <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
        {contents.length > 0 ? (
          <ContentGrid className="relative">
            {/* 배경 장식 */}
            <div className="absolute inset-0 bg-radial-gradient from-accent/5 to-transparent opacity-50 pointer-events-none" />

            {contents.map((content, idx) => {
              const isTop3 = showTop3Effect && ((page - 1) * ITEMS_PER_PAGE + idx + 1) <= 3;

              return (
                <div key={content.id} className="relative group">
                  {/* Top 3 강조 효과 */}
                  {isTop3 && (
                    <div className="absolute -inset-1 bg-gradient-to-br from-accent/30 to-transparent rounded-xl blur-sm opacity-0 group-hover:opacity-100" />
                  )}

                  <ContentCard
                    contentId={content.id}
                    contentType={content.type as ContentType}
                    title={content.title}
                    creator={content.creator}
                    thumbnail={content.thumbnail_url}
                    celebCount={content.celeb_count}
                    userCount={content.user_count}
                    rating={content.avg_rating ?? undefined}
                    href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                  />
                </div>
              );
            })}
          </ContentGrid>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 bg-bg-card/30 rounded-xl border border-border/30 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Scroll size={24} className="text-text-tertiary opacity-50" />
            </div>
            <p className="text-text-tertiary text-sm font-serif">작품이 없습니다</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && onPageChange && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
// #endregion

// #region 시대 정보 섹션
interface EraInfoProps {
  era?: EraScriptures;
  isAllEra?: boolean;
  topCelebsAcrossAllEras?: TopCeleb[];
  totalCelebCount?: number;
  totalContentCount?: number;
}

function EraInfo({ era, isAllEra = false, topCelebsAcrossAllEras = [], totalCelebCount = 0, totalContentCount = 0 }: EraInfoProps) {
  if (isAllEra) {
    return (
      <div className="mb-10 space-y-8">
        {/* 시대 타이틀 & 통계 */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="h-[1px] w-8 sm:w-12 bg-accent/30" />
            <div className="w-1.5 h-1.5 rotate-45 bg-accent" />
            <div className="h-[1px] w-8 sm:w-12 bg-accent/30" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-serif font-black text-text-primary mb-2">
            전체 시대
          </h3>
          <p className="text-sm sm:text-base font-cinzel text-accent/80 mb-4">All Eras</p>
          <div className="flex items-center justify-center gap-4 text-xs sm:text-sm text-text-secondary">
            <span>
              <span className="text-accent font-semibold">{totalCelebCount}</span>명의 위인
            </span>
            <span className="text-accent/30">·</span>
            <span>
              <span className="text-accent font-semibold">{totalContentCount}</span>개의 작품
            </span>
          </div>
        </div>

        {/* 대표 인물 & 시대 설명 */}
        <div className="grid md:grid-cols-12 gap-6 md:gap-8">
          {topCelebsAcrossAllEras.length > 0 && (
            <div className="md:col-span-4">
              <RepresentativeCelebs celebs={topCelebsAcrossAllEras} title="전체 시대" type="classic" />
            </div>
          )}

          <div className={topCelebsAcrossAllEras.length > 0 ? "md:col-span-8 flex items-center" : "md:col-span-12"}>
            <div className="w-full">
              <p className="text-sm sm:text-base text-text-primary/90 font-serif leading-relaxed px-4 py-4 bg-bg-card/30 rounded-xl border border-accent/10">
                시대를 초월해 가장 많은 인물들의 선택을 받은 작품들.
                <br />
                수많은 위인이 같은 책을 선택했다면, 그건 우연이 아닙니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!era) return null;

  return (
    <div className="mb-10 space-y-8">
      {/* 시대 타이틀 & 통계 */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="h-[1px] w-8 sm:w-12 bg-accent/30" />
          <div className="w-1.5 h-1.5 rotate-45 bg-accent" />
          <div className="h-[1px] w-8 sm:w-12 bg-accent/30" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-serif font-black text-text-primary mb-2">
          {era.label}
        </h3>
        <p className="text-sm sm:text-base font-cinzel text-accent/80 mb-4">{era.period}</p>
        <div className="flex items-center justify-center gap-4 text-xs sm:text-sm text-text-secondary">
          <span>
            <span className="text-accent font-semibold">{era.celebCount}</span>명의 위인
          </span>
          <span className="text-accent/30">·</span>
          <span>
            <span className="text-accent font-semibold">{era.contents.length}</span>개의 작품
          </span>
        </div>
      </div>

      {/* 대표 인물 & 시대 설명 */}
      <div className="grid md:grid-cols-12 gap-6 md:gap-8">
        {/* 대표 인물 */}
        {era.topCelebs.length > 0 && (
          <div className="md:col-span-4">
            <RepresentativeCelebs celebs={era.topCelebs.slice(0, 3)} title="시대의 상징" type="classic" />
          </div>
        )}

        {/* 시대 설명 */}
        <div className={era.topCelebs.length > 0 ? "md:col-span-8 flex items-center" : "md:col-span-12"}>
          <div className="w-full">
            <p className="text-sm sm:text-base text-text-primary/90 font-serif leading-relaxed px-4 py-4 bg-bg-card/30 rounded-xl border border-accent/10">
              {era.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
// #endregion

export default function EraSection({ initialEraData, initialChosenData, topCelebsAcrossAllEras }: Props) {
  const [selectedTab, setSelectedTab] = useState<TabValue>("all");
  const [data, setData] = useState(initialChosenData);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const selectedEraData = initialEraData.find((era) => era.era === selectedTab);

  // 시대별 콘텐츠 카테고리 필터링 (클라이언트 사이드)
  const filteredEraContents = useMemo(() => {
    if (!selectedEraData || categoryFilter === "ALL") {
      return selectedEraData?.contents || [];
    }
    return selectedEraData.contents.filter((c) => c.type === categoryFilter);
  }, [selectedEraData, categoryFilter]);

  const fetchData = (category: CategoryFilter, targetPage: number) => {
    startTransition(async () => {
      const result = await getChosenScriptures({
        category: category === "ALL" ? undefined : category,
        page: targetPage,
        limit: ITEMS_PER_PAGE,
      });
      setData(result);
    });
  };

  const handleCategoryChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    if (selectedTab === "all") {
      setPage(1);
      fetchData(category, 1);
    }
  };

  const handlePageChange = (targetPage: number) => {
    setPage(targetPage);
    fetchData(categoryFilter, targetPage);
  };

  const handleTabChange = (tab: TabValue) => {
    setSelectedTab(tab);
    setCategoryFilter("ALL");
    if (tab === "all") {
      setPage(1);
      fetchData("ALL", 1);
    }
  };

  if (initialEraData.length === 0 && initialChosenData.contents.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
        <p className="text-text-tertiary text-sm">데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="불후의 명작"
        label="TIMELESS WORKS"
        description={
          <>
            전 시대의 대표작과 시대별 명저.
            <br />
            <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
              가장 많은 인물들의 선택을 받은 작품들을 만나보세요.
            </span>
          </>
        }
      />

        <div className="flex justify-center mb-4">
          <DecorativeLabel label="시대 및 카테고리" />
        </div>

      {/* 시대 선택 탭 */}
      <div className="mb-6">
        <div className="flex justify-center overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1 min-w-max">
            {ERA_TABS.map((tab) => {
              const isActive = selectedTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`${TAB_BUTTON_STYLE} ${isActive ? TAB_ACTIVE_STYLE : TAB_INACTIVE_STYLE}`}
                >
                  <span className={isActive ? "font-serif text-black" : "font-sans"}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 카테고리 선택 탭 */}
      <div className="mb-12">
        <div className="flex justify-center overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1 min-w-max">
            {CATEGORY_TABS.map((tab) => {
              const isActive = categoryFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleCategoryChange(tab.value)}
                  className={`${TAB_BUTTON_STYLE} ${isActive ? TAB_ACTIVE_STYLE : TAB_INACTIVE_STYLE}`}
                >
                  <span className={isActive ? "font-serif text-black" : "font-sans"}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 선택된 콘텐츠 */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {selectedTab === "all" ? (
          <>
            <EraInfo
              isAllEra
              topCelebsAcrossAllEras={topCelebsAcrossAllEras}
              totalCelebCount={initialEraData.reduce((sum, e) => sum + e.celebCount, 0)}
              totalContentCount={data.total ?? data.contents.length}
            />
            <ContentSection
              contents={data.contents}
              isPending={isPending}
              page={page}
              totalPages={data.totalPages}
              onPageChange={handlePageChange}
              showTop3Effect
            />
          </>
        ) : selectedEraData ? (
          <>
            <EraInfo era={selectedEraData} />
            <ContentSection contents={filteredEraContents} />
          </>
        ) : (
          <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
            <p className="text-text-tertiary text-sm">해당 시대의 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
