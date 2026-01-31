/*
  파일명: /components/features/scriptures/Scriptures.tsx
  기능: 지혜의 서고 페이지 메인 뷰
  책임: 인물들의 선택(SSR), 길의 갈래/오늘의 인물/세대의 경전(lazy load) 렌더링
*/ // ------------------------------
"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Scroll, Route, User, Clock, Menu, X } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";
import { Pagination } from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import ScriptureCard from "./ScriptureCard";
import {
  getChosenScriptures,
  getScripturesByProfession,
  getTodaySage,
  getScripturesByEra,
  type ScripturesResult,
  type ScripturesByProfession as ProfessionData,
  type TodaySageResult,
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

interface SectionConfig {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  hasBg?: boolean;
}
// #endregion

// #region Constants
const SECTIONS: SectionConfig[] = [
  { id: "chosen-section", label: "인물들의 선택", description: "가장 많은 인물이 감상한 경전", icon: Scroll },
  { id: "profession-section", label: "길의 갈래", description: "분야별 인물들의 필독서", icon: Route, hasBg: true },
  { id: "sage-section", label: "오늘의 인물", description: "매일 새로운 인물의 서재를 탐방하세요", icon: User },
  { id: "era-section", label: "세대의 경전", description: "시대별 인물들의 선택", icon: Clock, hasBg: true },
];

// 섹션 ID로 config 조회
const getSectionConfig = (id: string) => SECTIONS.find((s) => s.id === id)!;

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "BOOK", label: "도서" },
  { value: "VIDEO", label: "영상" },
  { value: "GAME", label: "게임" },
  { value: "MUSIC", label: "음악" },
];

const ITEMS_PER_PAGE = 12;

const PROFESSION_LABELS: Record<string, string> = {
  entrepreneur: "기업인",
  scholar: "학자",
  artist: "예술가",
  politician: "정치인",
  author: "작가",
  commander: "지휘관",
  leader: "지도자",
  investor: "투자자",
  athlete: "운동선수",
  actor: "배우",
};
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
// #endregion

// #region Section Header
function ScriptureSectionHeader({ sectionId, extra }: { sectionId: string; extra?: React.ReactNode }) {
  const config = getSectionConfig(sectionId);
  const Icon = config.icon;

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-accent" />
        <h2 className="text-lg md:text-xl font-serif font-bold text-text-primary">{config.label}</h2>
        {extra}
      </div>
      <p className="text-sm text-text-secondary mb-6">{config.description}</p>
    </>
  );
}
// #endregion

// #region Floating TOC - FAB + Popover
function FloatingTOC({ activeSection }: { activeSection: string }) {
  const [isOpen, setIsOpen] = useState(false);

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
        aria-label="목차 열기"
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
            <h3 className="text-base font-semibold text-text-primary">목차</h3>
            <Button unstyled onClick={() => setIsOpen(false)} aria-label="닫기">
              <X size={20} className="text-text-secondary" />
            </Button>
          </div>
          <nav className="p-4 pb-8 space-y-1">
            {SECTIONS.map((section) => {
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
                  <span className="text-sm font-medium">{section.label}</span>
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

  const config = getSectionConfig("profession-section");

  return (
    <section id={config.id} ref={ref} className={`py-12 md:py-16 ${config.hasBg ? "bg-bg-card/30" : ""}`}>
      <ScriptureSectionHeader sectionId={config.id} />

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {professionData.contents.map((content, index) => (
                  <ScriptureCard
                    key={content.id}
                    id={content.id}
                    title={content.title}
                    creator={content.creator}
                    thumbnail={content.thumbnail_url}
                    type={content.type}
                    celebCount={content.celeb_count}
                    avgRating={content.avg_rating}
                    rank={(professionPage - 1) * ITEMS_PER_PAGE + index + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
                <p className="text-text-tertiary text-sm">해당 분야의 경전이 없습니다</p>
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
          <p className="text-text-tertiary text-sm">분야별 데이터가 없습니다</p>
        </div>
      )}
    </section>
  );
}
// #endregion

// #region 오늘의 인물 Section
const SAGE_MAX_DISPLAY = 11;

function TodaySageSection() {
  const [data, setData] = useState<TodaySageResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const ref = useIntersectionObserver(async () => {
    const result = await getTodaySage();
    setData(result);
    setIsLoaded(true);
  });

  const sage = data?.sage;
  const allContents = data?.contents || [];
  const displayContents = allContents.slice(0, SAGE_MAX_DISPLAY);
  const remainingCount = allContents.length - SAGE_MAX_DISPLAY;
  const config = getSectionConfig("sage-section");

  return (
    <section id={config.id} ref={ref} className={`py-12 md:py-16 ${config.hasBg ? "bg-bg-card/30" : ""}`}>
      <ScriptureSectionHeader sectionId={config.id} />

      {!isLoaded ? (
        <SectionSkeleton />
      ) : sage ? (
        <>
          <Link
            href={`/${sage.id}`}
            className="flex items-start gap-4 p-4 mb-6 bg-bg-card/50 rounded-xl border border-border/30 hover:border-accent/30"
          >
            {sage.avatar_url ? (
              <Image
                src={sage.avatar_url}
                alt={sage.nickname}
                width={64}
                height={64}
                className="rounded-full object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-xl text-accent font-bold shrink-0">
                {sage.nickname[0]}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary mb-1">{sage.nickname}</h3>
              {sage.profession && (
                <p className="text-xs text-accent mb-2">
                  {PROFESSION_LABELS[sage.profession] || sage.profession}
                </p>
              )}
              {sage.bio && <p className="text-sm text-text-secondary line-clamp-2">{sage.bio}</p>}
              <p className="text-xs text-text-tertiary mt-2">감상 기록 {sage.contentCount}개</p>
            </div>
          </Link>

          {displayContents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {displayContents.map((content) => (
                <ScriptureCard
                  key={content.id}
                  id={content.id}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  type={content.type}
                  celebCount={1}
                  avgRating={content.avg_rating}
                />
              ))}
              {/* 더보기 카드 */}
              <Link
                href={`/${sage.id}`}
                className="group flex flex-col items-center justify-center aspect-[2/3] bg-bg-card/50 border border-border/30 rounded-xl hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20">
                  <span className="text-2xl text-accent">→</span>
                </div>
                <span className="text-sm font-medium text-text-primary mb-1">서재 전체 보기</span>
                {remainingCount > 0 && (
                  <span className="text-xs text-text-tertiary">+{remainingCount}개 더</span>
                )}
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-text-tertiary text-sm">감상 기록이 없습니다</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">오늘의 인물이 없습니다</p>
        </div>
      )}
    </section>
  );
}
// #endregion

// #region 세대의 경전 Section
function EraSection() {
  const [data, setData] = useState<EraScriptures[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const ref = useIntersectionObserver(async () => {
    const result = await getScripturesByEra();
    setData(result);
    setIsLoaded(true);
  });

  const config = getSectionConfig("era-section");

  return (
    <section id={config.id} ref={ref} className={`py-12 md:py-16 ${config.hasBg ? "bg-bg-card/30" : ""}`}>
      <ScriptureSectionHeader sectionId={config.id} />

      {!isLoaded ? (
        <SectionSkeleton rows={4} />
      ) : data.length > 0 ? (
        <div className="space-y-8">
          {data.map((era) => (
            <div key={era.era}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-semibold text-text-primary">{era.label}</h3>
                <span className="text-xs text-accent/70">{era.period}</span>
                <span className="text-xs text-text-tertiary">(인물 {era.celebCount}명)</span>
              </div>

              {era.contents.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {era.contents.map((content, index) => (
                    <ScriptureCard
                      key={content.id}
                      id={content.id}
                      title={content.title}
                      creator={content.creator}
                      thumbnail={content.thumbnail_url}
                      type={content.type}
                      celebCount={content.celeb_count}
                      avgRating={content.avg_rating}
                      rank={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 bg-bg-card/50 rounded-xl border border-border/30">
                  <p className="text-text-tertiary text-sm">해당 시대의 경전이 없습니다</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">시대별 데이터가 없습니다</p>
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

  const activeSection = useActiveSection(SECTIONS.map((s) => s.id));

  useEffect(() => {
    startTransition(async () => {
      const result = await getChosenScriptures({
        category: categoryFilter === "ALL" ? undefined : categoryFilter,
        page: chosenPage,
        limit: ITEMS_PER_PAGE,
      });
      setChosenData(result);
    });
  }, [categoryFilter, chosenPage]);

  const handleCategoryChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setChosenPage(1);
  };

  const chosenConfig = getSectionConfig("chosen-section");

  return (
    <div>
      {/* 플로팅 목차 FAB */}
      <FloatingTOC activeSection={activeSection} />

      {/* 섹션 1: 인물들의 선택 (SSR) */}
      <section id={chosenConfig.id} className={`py-12 md:py-16 ${chosenConfig.hasBg ? "bg-bg-card/30" : ""}`}>
        <ScriptureSectionHeader
          sectionId={chosenConfig.id}
          extra={<span className="text-sm text-text-tertiary">({chosenData.total})</span>}
        />

        <div className="mb-6 overflow-x-auto scrollbar-hidden flex justify-center">
          <Tabs className="border-b border-border/30">
            {CATEGORY_TABS.map((tab) => (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {chosenData.contents.map((content, index) => (
                <ScriptureCard
                  key={content.id}
                  id={content.id}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  type={content.type}
                  celebCount={content.celeb_count}
                  avgRating={content.avg_rating}
                  rank={(chosenPage - 1) * ITEMS_PER_PAGE + index + 1}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-text-tertiary text-sm">해당 카테고리의 경전이 없습니다</p>
            </div>
          )}
        </div>

        {chosenData.totalPages > 1 && (
          <div className="mt-6">
            <Pagination currentPage={chosenPage} totalPages={chosenData.totalPages} onPageChange={setChosenPage} />
          </div>
        )}
      </section>

      {/* 섹션 2: 길의 갈래 (Lazy) */}
      <ProfessionSection professionCounts={initialProfessionCounts} />

      {/* 섹션 3: 오늘의 인물 (Lazy) */}
      <TodaySageSection />

      {/* 섹션 4: 세대의 경전 (Lazy) */}
      <EraSection />
    </div>
  );
}
// #endregion
