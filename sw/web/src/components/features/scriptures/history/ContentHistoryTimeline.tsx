/*
  파일명: /components/features/scriptures/history/ContentHistoryTimeline.tsx
  기능: 서고 콘텐츠의 역사 타임라인 뷰
  책임: 시대별 매체 변화와 콘텐츠의 흐름을 인라인 레이아웃으로 보여준다.
         좌측 목차 네비게이터로 빠른 이동을 지원한다.
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import { Scroll, ChevronLeft, ChevronRight } from "lucide-react";
import { CONTENT_HISTORY_TIMELINE, HISTORY_CATEGORIES, HISTORY_TIMELINES, HistoryEra, HistorySubCategory } from "@/constants/scripturesHistory";
import { FormattedText } from "@/components/ui";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import EraGanttChart from "./EraGanttChart";

// #region 에세이 본문 렌더러 (FormattedText 활용)
function EssayContent({ markdown }: { markdown: string }) {
  const paragraphs = markdown.split("\n\n");
  return (
    <div className="space-y-3 sm:space-y-4">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-white/75 text-[13px] sm:text-sm leading-[1.75] sm:leading-[1.8]">
          <FormattedText text={para} />
        </p>
      ))}
    </div>
  );
}
// #endregion

// #region 콘텐츠 분류 탭 (EraSection 탭 스타일 통일)
function CategoryTabs({ activeId, onChange }: { activeId: string; onChange: (id: string) => void }) {
  return (
    <div className="flex justify-center overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1 min-w-max">
        {HISTORY_CATEGORIES.map((cat) => {
          const isActive = cat.id === activeId;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className={`
                relative px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300
                flex items-center justify-center leading-tight min-w-[60px]
                ${isActive
                  ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                  : "text-text-secondary hover:text-white hover:bg-white/5"
                }
              `}
            >
              <span className={`flex items-center gap-1.5 ${isActive ? "font-serif text-black" : "font-sans"}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
// #endregion

// #region 서브 카테고리 탭 (매체/필기구 등)
function SubCategoryTabs({ subCategories, activeId, onChange }: { subCategories: HistorySubCategory[]; activeId: string; onChange: (id: string) => void }) {
  return (
    <div className="flex justify-center mt-3 sm:mt-4">
      <div className="inline-flex p-0.5 bg-white/[0.04] rounded-lg border border-white/[0.06] gap-0.5">
        {subCategories.map((sub) => {
          const isActive = sub.id === activeId;
          return (
            <button
              key={sub.id}
              onClick={() => onChange(sub.id)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${isActive
                  ? "text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/20"
                  : "text-white/40 hover:text-white/70 border border-transparent"
                }
              `}
            >
              {sub.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
// #endregion

// #region 사이드 목차 네비게이터 (데스크톱 xl 이상)
function TableOfContents({ activeId, eras, contentTopRef }: { activeId: string; eras: HistoryEra[]; contentTopRef: React.RefObject<HTMLDivElement | null> }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const activeIndex = eras.findIndex((e) => e.id === activeId);

  // 첫 번째 본문 섹션 위로 올라가지 않도록 가시성 제어
  useEffect(() => {
    const check = () => {
      if (!contentTopRef.current) return;
      const rect = contentTopRef.current.getBoundingClientRect();
      setVisible(rect.top <= window.innerHeight * 0.5);
    };
    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => window.removeEventListener("scroll", check);
  }, [contentTopRef]);

  // 활성 항목을 목차 내에서 자동 스크롤
  useEffect(() => {
    if (!listRef.current) return;
    const activeBtn = listRef.current.querySelector(`[data-toc="${activeId}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeId]);

  return (
    <nav className={`hidden xl:flex flex-col fixed left-[calc(50%-736px)] top-[calc(50%+32px)] -translate-y-1/2 z-30 w-52 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ fontFamily: "var(--font-sans)" }}>
      <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4 pl-1">
          <Scroll className="w-3.5 h-3.5 text-[#d4af37]/70" />
          <span className="text-[10px] text-[#d4af37]/60 uppercase tracking-[0.2em] font-semibold">
            Chronicle
          </span>
        </div>

        {/* 타임라인 리스트 */}
        <div ref={listRef} className="relative max-h-[60vh] overflow-y-auto scrollbar-hidden pl-1">
          {/* 세로 타임라인 라인 */}
          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-white/10" />
          {/* 활성 구간 하이라이트 — 활성 도트 중심까지만 */}
          <div
            className="absolute left-[13px] w-px bg-[#d4af37]/50 transition-all duration-500"
            style={{
              top: "8px",
              height: eras.length > 1
                ? `${(activeIndex / (eras.length - 1)) * 100}%`
                : "0px",
            }}
          />

          <div className="flex flex-col gap-0.5">
            {eras.map((era, index) => {
              const isActive = activeId === era.id;
              return (
                <button
                  key={era.id}
                  data-toc={era.id}
                  onClick={() => handleClick(era.id)}
                  className={`
                    group relative flex items-center gap-2.5 text-left text-[11px] pl-0.5 pr-2 py-2 rounded-lg
                    transition-all duration-300
                    ${isActive
                      ? "text-[#d4af37]"
                      : "text-white/60 hover:text-white/90"
                    }
                  `}
                >
                  {/* 번호 도트 */}
                  <div className={`
                    relative z-10 flex-shrink-0 w-[19px] h-[19px] rounded-full flex items-center justify-center
                    transition-all duration-300 text-[8px] font-mono font-bold leading-none border
                    ${isActive
                      ? "bg-[#1a1500] border-[#d4af37]/50 scale-110 text-[#d4af37]"
                      : "bg-[#0a0a0a] border-white/10 text-white/40 group-hover:text-white/70 group-hover:border-white/20"
                    }
                  `}>
                    {index + 1}
                  </div>
                  {/* 라벨 + 연대 */}
                  <div className="flex flex-col min-w-0">
                    <span className={`truncate transition-all duration-300 leading-tight ${isActive ? "font-bold text-[#d4af37]" : "font-medium text-white/70"}`}>
                      {era.name}
                    </span>
                    <span className={`text-[8px] truncate transition-all duration-300 tracking-wide ${isActive ? "text-[#d4af37]/60" : "text-white/30"}`}>
                      {era.period}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
// #endregion

// #region 하단 미니 네비게이터 (모바일/태블릿, xl 미만)
function MobileNavigator({ activeId, eras }: { activeId: string; eras: HistoryEra[] }) {
  const activeIndex = eras.findIndex((e) => e.id === activeId);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navRef.current) {
      const activeBtn = navRef.current.querySelector(`[data-era-id="${activeId}"]`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeId]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#121212]/90 backdrop-blur-md border-t border-white/[0.08] safe-area-bottom">
      {/* 프로그레스 바 */}
      <div className="h-[3px] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37]/50 to-[#d4af37]/80 transition-all duration-500"
          style={{ width: `${((activeIndex + 1) / eras.length) * 100}%` }}
        />
      </div>
      {/* 가로 스크롤 목차 */}
      <div ref={navRef} className="flex gap-1 px-2 py-2.5 overflow-x-auto scrollbar-hidden">
        {eras.map((era, index) => {
          const isActive = activeId === era.id;
          const isPast = index < activeIndex;
          return (
            <button
              key={era.id}
              data-era-id={era.id}
              onClick={() => handleClick(era.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 text-[10px] sm:text-[11px] px-3 py-2 rounded-full
                transition-all duration-300 whitespace-nowrap
                ${isActive
                  ? "text-[#d4af37] bg-[#d4af37]/15 font-semibold shadow-[0_0_8px_rgba(212,175,55,0.15)]"
                  : isPast
                    ? "text-white/50"
                    : "text-white/30"
                }
              `}
            >
              <span className={`
                inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300
                ${isActive
                  ? "bg-[#d4af37] shadow-[0_0_4px_rgba(212,175,55,0.6)]"
                  : isPast
                    ? "bg-white/30"
                    : "bg-white/15"
                }
              `} />
              {era.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
// #endregion

// #region 시대별 섹션
function EraSection({ era, index, eras }: { era: HistoryEra; index: number; eras: HistoryEra[] }) {
  const prevEra = index > 0 ? eras[index - 1] : null;
  const nextEra = index < eras.length - 1 ? eras[index + 1] : null;

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section id={`era-${era.id}`} className="relative scroll-mt-4">
      {/* 구분선 (첫 번째 제외) */}
      {index > 0 && (
        <div className="flex items-center justify-center py-10 sm:py-16 md:py-20">
          <div className="w-px h-12 sm:h-16 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
        </div>
      )}

      {/* 히어로 영역 */}
      {era.imageUrl ? (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
          className="relative w-full max-w-3xl mx-auto h-[35vh] sm:h-[45vh] md:h-[55vh] overflow-hidden rounded-xl sm:rounded-2xl mb-0 px-4 sm:px-6"
        >
          <Image
            src={era.imageUrl}
            alt={era.name}
            fill
            className="object-cover rounded-xl sm:rounded-2xl"
            sizes="(max-width: 640px) 100vw, 768px"
            priority={index < 2}
          />
          {/* 비네팅 오버레이 */}
          <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-black/30 via-black/10 to-black/50" />

          <div className="absolute inset-0 flex items-center justify-center z-10 px-4">
            {prevEra ? (
              <button
                onClick={() => scrollTo(prevEra.id)}
                className="absolute left-5 sm:left-7 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] leading-tight">
                {era.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs sm:text-sm text-[#d4af37] font-semibold tracking-wider font-cinzel drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                  {era.period}
                </span>
                <span className="text-white/40 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">·</span>
                <span className="text-xs sm:text-sm text-white/80 font-semibold drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                  {index + 1} / {eras.length}
                </span>
              </div>
            </motion.div>

            {nextEra ? (
              <button
                onClick={() => scrollTo(nextEra.id)}
                className="absolute right-5 sm:right-7 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : (
        /* 이미지 없는 텍스트 전용 헤더 */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-3xl mx-auto px-4 sm:px-6"
        >
          <div className="relative flex items-center justify-center py-8 sm:py-12 md:py-16">
            {prevEra ? (
              <button
                onClick={() => scrollTo(prevEra.id)}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}

            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white leading-tight">
                {era.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs sm:text-sm text-[#d4af37] font-semibold tracking-wider font-cinzel">
                  {era.period}
                </span>
                <span className="text-white/40">·</span>
                <span className="text-xs sm:text-sm text-white/60 font-semibold">
                  {index + 1} / {eras.length}
                </span>
              </div>
            </div>

            {nextEra ? (
              <button
                onClick={() => scrollTo(nextEra.id)}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}
          </div>
        </motion.div>
      )}

      {/* 본문 콘텐츠 영역 */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* 설명 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="pt-4 sm:pt-6 pb-3 sm:pb-4"
        >
          <p className="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed">
            {era.description}
          </p>
        </motion.div>

        {/* 논고 본문 (FormattedText) */}
        {era.essay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="pb-4 sm:pb-6"
          >
            <div className="border-t border-white/10 pt-4 sm:pt-6 mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg md:text-xl font-serif font-bold text-white">
                {era.essay.title}
              </h3>
            </div>

            <EssayContent markdown={era.essay.contentMarkdown} />
          </motion.div>
        )}

        {/* 주요 콘텐츠 태그 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pb-3"
        >
          <h4 className="text-[10px] sm:text-xs text-white/30 uppercase tracking-widest mb-1.5 sm:mb-2 font-semibold">주요 콘텐츠</h4>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {era.contents.map((content, idx) => (
              <span
                key={idx}
                className="text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-white/10 bg-white/5 text-white/70"
              >
                {content}
              </span>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
// #endregion

// #region 메인 컴포넌트
interface ContentHistoryTimelineProps {
  /** 표시할 시대 데이터. 미지정 시 책(CONTENT_HISTORY_TIMELINE) 기본 사용 */
  eras?: HistoryEra[];
  /** 활성 카테고리 ID (탭 하이라이트용) */
  categoryId?: string;
}

export default function ContentHistoryTimeline({
  eras: erasProp,
  categoryId: categoryIdProp = "book",
}: ContentHistoryTimelineProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(categoryIdProp);
  const activeCategory = HISTORY_CATEGORIES.find((c) => c.id === activeCategoryId);
  const subCategories = activeCategory?.subCategories;
  const [activeSubId, setActiveSubId] = useState(subCategories?.[0]?.id ?? "");

  // 카테고리 변경 시 서브 탭 리셋
  useEffect(() => {
    const subs = HISTORY_CATEGORIES.find((c) => c.id === activeCategoryId)?.subCategories;
    setActiveSubId(subs?.[0]?.id ?? "");
  }, [activeCategoryId]);

  // 타임라인 키: 서브 카테고리가 있으면 "book/media" 형태, 없으면 "video" 형태
  const timelineKey = subCategories ? `${activeCategoryId}/${activeSubId}` : activeCategoryId;
  const eras = erasProp ?? HISTORY_TIMELINES[timelineKey] ?? CONTENT_HISTORY_TIMELINE;
  const [activeEraId, setActiveEraId] = useState(eras[0]?.id ?? "");
  const contentTopRef = useRef<HTMLDivElement>(null);

  // 설명 텍스트: 서브 카테고리가 있으면 해당 서브의 description, 없으면 카테고리 description
  const description = subCategories
    ? subCategories.find((s) => s.id === activeSubId)?.description
    : activeCategory?.description;

  // eras가 변경되면 첫 번째 항목으로 리셋
  useEffect(() => {
    setActiveEraId(eras[0]?.id ?? "");
  }, [activeCategoryId, activeSubId]);

  // 스크롤 위치 기반으로 현재 보이는 시대 감지
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const trigger = window.innerHeight * 0.3; // 뷰포트 상단 30% 지점
        let current = eras[0]?.id ?? "";
        for (const era of eras) {
          const el = document.getElementById(`era-${era.id}`);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= trigger) {
            current = era.id;
          } else {
            break;
          }
        }
        setActiveEraId(current);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [eras]);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 sm:py-12 md:py-20 pb-24 sm:pb-28 xl:pb-20">
      {/* 사이드 목차 (데스크톱) */}
      <TableOfContents activeId={activeEraId} eras={eras} contentTopRef={contentTopRef} />

      {/* 하단 네비게이터 (모바일/태블릿) */}
      <MobileNavigator activeId={activeEraId} eras={eras} />

      {/* 페이지 헤더 */}
      <div className="mb-6 sm:mb-10 md:mb-12 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center justify-center space-x-2 border border-white/10 bg-white/5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-4 sm:mb-6">
            <Scroll className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
            <span className="text-[10px] sm:text-xs text-white/80 font-medium tracking-widest uppercase">Chronicle of Knowledge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white mb-3 sm:mb-4 leading-tight">
            콘텐츠의 연대기
          </h1>
          <p className="text-white/60 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
            {description ?? "인류가 이야기를 담아온 매체의 변천사를 살펴봅니다."}
          </p>
        </motion.div>

        {/* 콘텐츠 분류 탭 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <CategoryTabs activeId={activeCategoryId} onChange={setActiveCategoryId} />
          {subCategories && subCategories.length > 1 && (
            <SubCategoryTabs subCategories={subCategories} activeId={activeSubId} onChange={setActiveSubId} />
          )}
        </motion.div>
      </div>

      {/* 간트 차트 인포그래픽 */}
      <div className="px-4 sm:px-0">
        <EraGanttChart key={timelineKey} eras={eras} />
      </div>

      {/* 시대별 인라인 섹션 */}
      <div ref={contentTopRef} className="flex flex-col">
        {eras.map((era, index) => (
          <EraSection key={era.id} era={era} index={index} eras={eras} />
        ))}
      </div>
    </div>
  );
}
// #endregion
