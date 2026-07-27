/*
  파일명: /components/features/scriptures/sections/EraSection.tsx
  기능: 불후의 명작 섹션 (통합)
  책임: 전체 시대 + 시대별 인물들의 선택을 보여준다.
*/ // ------------------------------

"use client";

import { useState, useTransition } from "react";
import { Scroll } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import RepresentativeCelebs from "../RepresentativeCelebs";
import { getCategoryByDbType, CATEGORIES } from "@/constants/categories";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import { Pagination } from "@/components/ui/Pagination";
import { DecorativeLabel } from "@/components/ui";
import SectionHeader from "@/components/shared/SectionHeader";
import type { ContentType } from "@/types/database";
import type { EraScriptures, ScripturesResult } from "@/actions/scriptures";
import { getChosenScriptures, getEraContents } from "@/actions/scriptures";
import { useTranslations } from "next-intl";

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
  title_ko?: string | null;
  title_en?: string | null;
  creator_en?: string | null;
  isbn_en?: string | null;
  thumbnail_en?: string | null;
  has_en_edition?: boolean | null;
}
// #endregion

// #region Constants
const ERA_TAB_VALUES: TabValue[] = ["all", "contemporary", "modern", "medieval", "ancient"];

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
  const te = useTranslations("scriptures.page.eraPage");
  const tempty = useTranslations("scriptures.page.empty");
  return (
    <div>
      {/* 작품 라벨 */}
      <div className="mb-4 flex justify-center">
        <DecorativeLabel label={te("worksList")} />
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
                    titleKo={content.title_ko}
                    titleEn={content.title_en}
                    creatorEn={content.creator_en}
                    thumbnailEn={content.thumbnail_en}
                    hasEnEdition={content.has_en_edition}
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
            <p className="text-text-tertiary text-sm font-serif">{tempty("noWorks")}</p>
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
  const t = useTranslations("scriptures.page.eraPage");

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
            {t("allEras")}
          </h3>
          <p className="text-sm sm:text-base font-cinzel text-accent/80 mb-4">{t("allErasCaption")}</p>
          <div className="flex items-center justify-center gap-4 text-sm text-text-secondary">
            <span>{t("figureCount", { count: totalCelebCount })}</span>
            <span className="text-accent/30">·</span>
            <span>{t("worksCount", { count: totalContentCount })}</span>
          </div>
        </div>

        {/* 대표 인물 & 시대 설명 */}
        <div className="grid md:grid-cols-12 gap-6 md:gap-8">
          {topCelebsAcrossAllEras.length > 0 && (
            <div className="md:col-span-4">
              <RepresentativeCelebs celebs={topCelebsAcrossAllEras} title={t("allEras")} type="classic" />
            </div>
          )}

          <div className={topCelebsAcrossAllEras.length > 0 ? "md:col-span-8 flex items-center" : "md:col-span-12"}>
            <div className="w-full">
              <p className="text-base text-text-primary/90 font-serif leading-relaxed px-4 py-4 bg-bg-card/30 rounded-xl border border-accent/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] whitespace-pre-line">
                {t("crossEraDescription")}
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
        <div className="flex items-center justify-center gap-4 text-sm text-text-secondary">
          <span>{t("figureCount", { count: era.celebCount })}</span>
          <span className="text-accent/30">·</span>
          <span>{t("worksCount", { count: era.contents.length })}</span>
        </div>
      </div>

      {/* 대표 인물 & 시대 설명 */}
      <div className="grid md:grid-cols-12 gap-6 md:gap-8">
        {/* 대표 인물 */}
        {era.topCelebs.length > 0 && (
          <div className="md:col-span-4">
            <RepresentativeCelebs celebs={era.topCelebs.slice(0, 3)} title={t("symbolOfEra")} type="classic" />
          </div>
        )}

        {/* 시대 설명 */}
        <div className={era.topCelebs.length > 0 ? "md:col-span-8 flex items-center" : "md:col-span-12"}>
          <div className="w-full">
            <p className="text-base text-text-primary/90 font-serif leading-relaxed px-4 py-4 bg-bg-card/30 rounded-xl border border-accent/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
  const t = useTranslations("scriptures.page.eraPage");
  const tc = useTranslations("content.category");
  const te = useTranslations("scriptures.page.empty");

  const eraTabs: { value: TabValue; label: string }[] = ERA_TAB_VALUES.map((v) => ({
    value: v,
    label: t(`eraTabs.${v}`),
  }));

  const categoryTabs: { value: CategoryFilter; label: string }[] = [
    { value: "ALL", label: tc("all") },
    ...CATEGORIES.filter((c) => ["BOOK", "VIDEO", "GAME", "MUSIC"].includes(c.dbType)).map((c) => ({
      value: c.dbType as CategoryFilter,
      label: tc(c.id),
    })),
  ];

  const selectedEraData = initialEraData.find((era) => era.era === selectedTab);

  const fetchData = (tab: TabValue, category: CategoryFilter, targetPage: number) => {
    startTransition(async () => {
      if (tab === "all") {
        const result = await getChosenScriptures({
          category: category === "ALL" ? undefined : category,
          page: targetPage,
          limit: ITEMS_PER_PAGE,
        });
        setData(result);
      } else {
        const result = await getEraContents({
          era: tab,
          category: category === "ALL" ? undefined : category,
          page: targetPage,
          limit: ITEMS_PER_PAGE,
        });
        setData(result);
      }
    });
  };

  const handleCategoryChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setPage(1);
    fetchData(selectedTab, category, 1);
  };

  const handlePageChange = (targetPage: number) => {
    setPage(targetPage);
    fetchData(selectedTab, categoryFilter, targetPage);
  };

  const handleTabChange = (tab: TabValue) => {
    setSelectedTab(tab);
    setCategoryFilter("ALL");
    setPage(1);
    fetchData(tab, "ALL", 1);
  };

  if (initialEraData.length === 0 && initialChosenData.contents.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
        <p className="text-text-tertiary text-sm">{te("noData")}</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title={t("title")}
        label="TIMELESS WORKS"
        description={
          <>
            {t("description")}
            <br />
            <span className="text-text-tertiary text-sm mt-1 block">
              {t("descriptionSub")}
            </span>
          </>
        }
      />

        <div className="flex justify-center mb-4">
          <DecorativeLabel label={t("eraAndCategory")} />
        </div>

      {/* 시대 선택 탭 */}
      <div className="mb-6">
        <div className="flex justify-center overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1 min-w-max">
            {eraTabs.map((tab) => {
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
            {categoryTabs.map((tab) => {
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
            <ContentSection
              contents={data.contents}
              isPending={isPending}
              page={page}
              totalPages={data.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
            <p className="text-text-tertiary text-sm">{te("noEraSection")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
