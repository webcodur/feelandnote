/*
  파일명: /components/features/scriptures/Scriptures/Scriptures.tsx
  기능: 지혜의 서가 페이지 메인 뷰
  책임: 공통 서가(SSR), 길의 갈래/오늘의 인물/시대의 작품(lazy load) 렌더링
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import { Scroll, Route, Clock, Menu, X } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";
import { Pagination } from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import ContentGrid from "@/components/ui/ContentGrid";
import { ContentCard } from "@/components/ui/cards";
import { getCategoryByDbType, CATEGORIES } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import { useTranslations } from "next-intl";
import {
  getChosenScriptures,
  getScripturesByEra,
  type EraScriptures,
} from "@/actions/scriptures";

import { useActiveSection } from "./hooks";
import { useIntersectionObserver } from "./hooks";
import { SectionSkeleton, ScriptureSectionHeader } from "./shared";
import { SECTION_IDS, ITEMS_PER_PAGE } from "./types";
import type { ScripturesProps, CategoryFilter } from "./types";
import TodaySageSection from "./sections/TodaySageSection";
import ChosenProfessionSection from "./sections/ChosenProfessionSection";

// #region Floating TOC - FAB + Popover
function FloatingTOC({ activeSection }: { activeSection: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("scriptures.page");
  const ts = useTranslations("scriptures.page.section");

  const handleNavigate = (sectionId: string) => {
    setIsOpen(false);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* FAB */}
      <Button
        unstyled
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 w-12 h-12 bg-accent text-white rounded-full shadow-lg flex items-center justify-center"
        aria-label={t("openToc")}
      >
        <Menu size={20} />
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* BottomSheet */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-80 md:rounded-2xl z-50 bg-bg-card rounded-t-2xl border-t md:border border-border/30 animate-bottomsheet-content">
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <h3 className="text-base font-semibold text-text-primary">{t("toc")}</h3>
            <Button unstyled onClick={() => setIsOpen(false)} aria-label={t("close")}>
              <X size={20} className="text-text-secondary" />
            </Button>
          </div>
          <nav className="p-4 pb-8 space-y-1">
            {SECTION_IDS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => handleNavigate(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-start ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-white/5"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{ts(`${section.key}.label`)}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
// #endregion

// #region 시대의 작품 Section
function EraSection() {
  const [data, setData] = useState<EraScriptures[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const t = useTranslations("scriptures.page");

  const ref = useIntersectionObserver(async () => {
    const result = await getScripturesByEra();
    setData(result);
    setIsLoaded(true);
  });

  return (
    <section id="era-section" ref={ref} className="py-12 md:py-16 bg-bg-card/30">
      <ScriptureSectionHeader sectionKey="era" icon={Clock} />

      {!isLoaded ? (
        <SectionSkeleton rows={4} />
      ) : data.length > 0 ? (
        <div className="space-y-8">
          {data.map((era) => (
            <div key={era.era}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-semibold text-text-primary">{era.label}</h3>
                <span className="text-xs text-accent/70">{era.period}</span>
                <span className="text-xs text-text-tertiary">{t("celebCount", { count: era.celebCount })}</span>
              </div>

              {era.contents.length > 0 ? (
                <ContentGrid>
                  {era.contents.map((content) => (
                    <ContentCard
                      key={content.id}
                      contentId={content.id}
                      contentType={content.type as ContentType}
                      title={content.title}
                      creator={content.creator}
                      thumbnail={content.thumbnail_url}
                      rating={content.avg_rating ?? undefined}
                      href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                      titleKo={content.title_ko}
                      titleEn={content.title_en}
                      creatorEn={content.creator_en}
                      thumbnailEn={content.thumbnail_en}
                      mobileLayout="review"
                    />
                  ))}
                </ContentGrid>
              ) : (
                <div className="flex items-center justify-center h-24 bg-bg-card/50 rounded-xl border border-border/30">
                  <p className="text-text-tertiary text-sm">{t("empty.noEra")}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">{t("empty.noEraData")}</p>
        </div>
      )}
    </section>
  );
}
// #endregion

// #region Main Component
export default function Scriptures({ initialChosen, initialProfessionCounts }: ScripturesProps) {
  const [chosenData, setChosenData] = useState(initialChosen);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [chosenPage, setChosenPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const tc = useTranslations("content.category");
  const te = useTranslations("scriptures.page.empty");

  const activeSection = useActiveSection(SECTION_IDS.map((s) => s.id));

  const categoryTabs: { value: CategoryFilter; label: string }[] = [
    { value: "ALL", label: tc("all") },
    ...CATEGORIES.filter((c) => ["BOOK", "VIDEO", "GAME", "MUSIC"].includes(c.dbType)).map((c) => ({
      value: c.dbType as CategoryFilter,
      label: tc(c.id),
    })),
  ];

  const fetchChosenData = (category: CategoryFilter, targetPage: number) => {
    startTransition(async () => {
      const result = await getChosenScriptures({
        category: category === "ALL" ? undefined : category,
        page: targetPage,
        limit: ITEMS_PER_PAGE,
      });
      setChosenData(result);
    });
  };

  const handleCategoryChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setChosenPage(1);
    fetchChosenData(category, 1);
  };

  const handleChosenPageChange = (targetPage: number) => {
    setChosenPage(targetPage);
    fetchChosenData(categoryFilter, targetPage);
  };

  return (
    <div>
      {/* 플로팅 목차 FAB */}
      <FloatingTOC activeSection={activeSection} />

      {/* 섹션 1: 오늘의 인물 (Lazy) */}
      <TodaySageSection />

      {/* 섹션 2: 공통 서가 (SSR) */}
      <section id="chosen-section" className="py-12 md:py-16 bg-bg-card/30">
        <ScriptureSectionHeader
          sectionKey="chosen"
          icon={Scroll}
          extra={<span className="text-sm text-text-tertiary">({chosenData.total})</span>}
        />

        <div className="mb-6 overflow-x-auto scrollbar-hidden flex justify-center">
          <Tabs className="border-b border-border/30">
            {categoryTabs.map((tab) => (
              <Tab
                key={tab.value}
                active={categoryFilter === tab.value}
                onClick={() => handleCategoryChange(tab.value)}
                label={tab.label}
                className="whitespace-nowrap"
              />
            ))}
          </Tabs>
        </div>

        <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
          {chosenData.contents.length > 0 ? (
            <ContentGrid>
              {chosenData.contents.map((content) => (
                <ContentCard
                  key={content.id}
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
                  mobileLayout="review"
                />
              ))}
            </ContentGrid>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-text-tertiary text-sm">{te("noCategory")}</p>
            </div>
          )}
        </div>

        {chosenData.totalPages > 1 && (
          <div className="mt-6">
            <Pagination currentPage={chosenPage} totalPages={chosenData.totalPages} onPageChange={handleChosenPageChange} />
          </div>
        )}
      </section>

      {/* 섹션 3: 갈림길 (Lazy) */}
      <ChosenProfessionSection professionCounts={initialProfessionCounts} />

      {/* 섹션 4: 시대의 작품 (Lazy) */}
      <EraSection />
    </div>
  );
}
// #endregion
