/*
  파일명: /components/features/scriptures/Scriptures.tsx
  기능: 지혜의 서고 페이지 메인 뷰
  책임: 공통 서가(SSR), 길의 갈래/오늘의 인물/시대의 작품(lazy load) 렌더링
*/ // ------------------------------
"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Scroll, Route, User, Clock, Menu, X } from "lucide-react";
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
  getScripturesByProfession,
  getTodayFigure,
  getScripturesByEra,
  type ScripturesResult,
  type ScripturesByProfession as ProfessionData,
  type TodayFigureResult,
  type EraScriptures,
} from "@/actions/scriptures";
import type { LucideIcon } from "lucide-react";

// #region Types
interface ProfessionCount {
  profession: string;
  label: string;
  count: number;
}

interface ScripturesProps {
  initialChosen: ScripturesResult;
  initialProfessionCounts: ProfessionCount[];
}

type CategoryFilter = "ALL" | "BOOK" | "VIDEO" | "GAME" | "MUSIC";
// #endregion

// #region Constants
const SECTION_IDS = [
  { id: "sage-section", key: "sage", icon: User },
  { id: "chosen-section", key: "chosen", icon: Scroll, hasBg: true },
  { id: "profession-section", key: "profession", icon: Route },
  { id: "era-section", key: "era", icon: Clock, hasBg: true },
] as const;

const ITEMS_PER_PAGE = 12;
// #endregion

// #region useIntersectionObserver Hook
function useIntersectionObserver(callback: () => void, options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasTriggered.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;
          callback();
          observer.disconnect();
        }
      },
      { rootMargin: "200px", ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [callback, options]);

  return ref;
}
// #endregion

// #region useActiveSection Hook - 스크롤 스파이
function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState(sectionIds[0]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);

  return activeSection;
}
// #endregion

// #region Section Skeleton
function SectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={rowIndex > 0 ? "mt-8" : ""}>
          <div className="h-5 w-24 bg-bg-card rounded mb-4" />
          <ContentGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
            ))}
          </ContentGrid>
        </div>
      ))}
    </div>
  );
}
// #endregion

// #region Section Header
function ScriptureSectionHeader({ sectionKey, icon: Icon, extra }: { sectionKey: string; icon: LucideIcon; extra?: React.ReactNode }) {
  const t = useTranslations("scriptures.page.section");

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-accent" />
        <h2 className="text-lg md:text-xl font-serif font-bold text-text-primary">{t(`${sectionKey}.label`)}</h2>
        {extra}
      </div>
      <p className="text-sm text-text-secondary mb-6">{t(`${sectionKey}.description`)}</p>
    </>
  );
}
// #endregion

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


// #region 길의 갈래 Section
function ProfessionSection({ professionCounts }: { professionCounts: ProfessionCount[] }) {
  const [professionData, setProfessionData] = useState<ProfessionData | null>(null);
  const [activeProfession, setActiveProfession] = useState(professionCounts[0]?.profession || "");
  const [professionPage, setProfessionPage] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const te = useTranslations("scriptures.page.empty");

  const loadData = useCallback(async (profession: string, page: number) => {
    startTransition(async () => {
      const result = await getScripturesByProfession({ profession, page, limit: ITEMS_PER_PAGE });
      setProfessionData(result);
      setIsLoaded(true);
    });
  }, []);

  const ref = useIntersectionObserver(() => {
    if (activeProfession) loadData(activeProfession, 1);
  });

  const handleProfessionChange = (profession: string) => {
    setActiveProfession(profession);
    setProfessionPage(1);
    loadData(profession, 1);
  };

  const handlePageChange = (page: number) => {
    setProfessionPage(page);
    loadData(activeProfession, page);
  };

  const totalPages = professionData ? Math.ceil(professionData.total / ITEMS_PER_PAGE) : 0;

  return (
    <section id="profession-section" ref={ref} className="py-12 md:py-16">
      <ScriptureSectionHeader sectionKey="profession" icon={Route} />

      {!isLoaded ? (
        <SectionSkeleton />
      ) : professionCounts.length > 0 ? (
        <>
          <div className="mb-6 overflow-x-auto scrollbar-hidden">
            <Tabs className="border-b border-border/30">
              {professionCounts.map((item) => (
                <Tab
                  key={item.profession}
                  active={activeProfession === item.profession}
                  onClick={() => handleProfessionChange(item.profession)}
                  label={
                    <span className="flex items-center gap-1.5">
                      {item.label}
                      <span className="text-xs text-text-tertiary">({item.count})</span>
                    </span>
                  }
                  className="whitespace-nowrap"
                />
              ))}
            </Tabs>
          </div>

          <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
            {professionData && professionData.contents.length > 0 ? (
              <ContentGrid>
                {professionData.contents.map((content) => (
                  <ContentCard
                    key={content.id}
                    contentId={content.id}
                    contentType={content.type as ContentType}
                    title={content.title}
                    creator={content.creator}
                    thumbnail={content.thumbnail_url}
                    rating={content.avg_rating ?? undefined}
                    href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                  />
                ))}
              </ContentGrid>
            ) : (
              <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
                <p className="text-text-tertiary text-sm">{te("noProfession")}</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={professionPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">{te("noProfessionData")}</p>
        </div>
      )}
    </section>
  );
}
// #endregion

// #region 오늘의 인물 Section
const SAGE_MAX_DISPLAY = 11;

function TodaySageSection() {
  const [data, setData] = useState<TodayFigureResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const t = useTranslations("scriptures.page");
  const tp = useTranslations("profession");

  const ref = useIntersectionObserver(async () => {
    const result = await getTodayFigure();
    setData(result);
    setIsLoaded(true);
  });

  const figure = data?.figure;
  const allContents = data?.contents || [];
  const displayContents = allContents.slice(0, SAGE_MAX_DISPLAY);
  const remainingCount = allContents.length - SAGE_MAX_DISPLAY;

  return (
    <section id="sage-section" ref={ref} className="py-12 md:py-16">
      <ScriptureSectionHeader sectionKey="sage" icon={User} />

      {!isLoaded ? (
        <SectionSkeleton />
      ) : figure ? (
        <>
          <Link
            href={`/${figure.id}`}
            className="flex items-start gap-4 p-4 mb-6 bg-bg-card/50 rounded-xl border border-border/30 hover:border-accent/30"
          >
            {figure.avatar_url ? (
              <Image
                src={figure.avatar_url}
                alt={figure.nickname}
                width={64}
                height={64}
                className="rounded-full object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-xl text-accent font-bold shrink-0">
                {figure.nickname[0]}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary mb-1">{figure.nickname}</h3>
              {figure.profession && (
                <p className="text-xs text-accent mb-2">
                  {tp(figure.profession)}
                </p>
              )}
              {figure.bio && <p className="text-sm text-text-secondary line-clamp-2">{figure.bio}</p>}
              <p className="text-xs text-text-tertiary mt-2">
                {t("reviewCount", { count: figure.contentCount })}
                {data?.source?.type === 'news' && (
                  <span className="ml-2 text-blue-400">· {t("newsMention", { count: data.source.newsCount })}</span>
                )}
              </p>
            </div>
          </Link>

          {displayContents.length > 0 ? (
            <ContentGrid>
              {displayContents.map((content) => (
                <ContentCard
                  key={content.id}
                  contentId={content.id}
                  contentType={content.type as ContentType}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  rating={content.avg_rating ?? undefined}
                  href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                />
              ))}
              {/* 더보기 카드 */}
              <Link
                href={`/${figure.id}`}
                className="group flex flex-col items-center justify-center aspect-[2/3] bg-bg-card/50 border border-border/30 rounded-xl hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20">
                  <span className="text-2xl text-accent">→</span>
                </div>
                <span className="text-sm font-medium text-text-primary mb-1">{t("viewFullLibrary")}</span>
                {remainingCount > 0 && (
                  <span className="text-xs text-text-tertiary">{t("moreCount", { count: remainingCount })}</span>
                )}
              </Link>
            </ContentGrid>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-text-tertiary text-sm">{t("empty.noRecords")}</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">{t("empty.noFigure")}</p>
        </div>
      )}
    </section>
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
      <ProfessionSection professionCounts={initialProfessionCounts} />

      {/* 섹션 4: 시대의 작품 (Lazy) */}
      <EraSection />
    </div>
  );
}
// #endregion
