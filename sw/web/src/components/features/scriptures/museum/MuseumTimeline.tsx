/*
  파일명: /components/features/scriptures/museum/MuseumTimeline.tsx
  기능: 서고 전시관 타임라인 뷰
  책임: 시대별 매체 변화와 콘텐츠의 흐름을 인라인 레이아웃으로 보여준다.
         좌측 목차 네비게이터로 빠른 이동을 지원한다.
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import { Scroll, ChevronLeft, ChevronRight } from "lucide-react";
import { getScripturesData, MUSEUM_CATEGORY_IDS, SUB_CATEGORY_VIEW_TYPE, type HistoryEra } from "@/constants/scripturesMuseum";
import TypographyCatalog from "./TypographyCatalog";
import { FormattedText } from "@/components/ui";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import EraGanttChart from "./EraGanttChart";
import { useLocale, useTranslations } from "next-intl";

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
  const t = useTranslations("scriptures.museum.category");
  return (
    <div className="flex justify-center overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1 min-w-max">
        {MUSEUM_CATEGORY_IDS.map((cat) => {
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
                {t(`${cat.id}.label`)}
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
function SubCategoryTabs({ categoryId, subIds, activeId, onChange }: { categoryId: string; subIds: readonly { id: string }[]; activeId: string; onChange: (id: string) => void }) {
  const t = useTranslations(`scriptures.museum.sub.${categoryId}`);
  return (
    <div className="flex justify-center mt-3 sm:mt-4">
      <div className="inline-flex p-0.5 bg-white/[0.04] rounded-lg border border-white/[0.06] gap-0.5">
        {subIds.map((sub) => {
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
              {t(`${sub.id}.label`)}
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

  const activeIndex = Math.max(0, eras.findIndex((e) => e.id === activeId));

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

  useEffect(() => {
    if (!listRef.current) return;
    const activeBtn = listRef.current.querySelector(`[data-toc="${activeId}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeId]);

  return (
    <nav className={`hidden xl:flex flex-col fixed left-[calc(50%-800px)] top-[calc(50%+32px)] -translate-y-1/2 z-30 w-64 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ fontFamily: "var(--font-sans)" }}>
      <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2.5 mb-5 pl-2">
          <Scroll className="w-4 h-4 text-[#d4af37]/80" />
          <span className="text-xs text-[#d4af37]/70 uppercase tracking-[0.25em] font-bold">
            Chronicle
          </span>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto scrollbar-hidden px-1">
          <div className="relative py-2">
            <div className="absolute left-[22px] top-[32px] bottom-[32px] w-[2px] bg-white/5 rounded-full z-0" />
            <div
              className="absolute left-[22px] w-[2px] bg-gradient-to-b from-[#d4af37]/80 to-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-500 rounded-full z-0"
              style={{
                top: "32px",
                height: eras.length > 1
                  ? `calc((100% - 64px) * ${activeIndex / (eras.length - 1)})`
                  : "0px",
              }}
            />

            <div className="flex flex-col gap-1.5 relative z-10">
            {eras.map((era, index) => {
              const isActive = activeId === era.id;
              return (
                <button
                  key={era.id}
                  data-toc={era.id}
                  onClick={() => handleClick(era.id)}
                  className={`
                    group relative flex items-center gap-3.5 text-left px-2 py-2.5 rounded-xl
                    transition-all duration-300 w-full hover:bg-white/5
                  `}
                >
                  <div className={`
                    relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                    transition-all duration-300 text-xs font-mono font-bold leading-none
                    ${isActive
                      ? "bg-gradient-to-br from-[#f9e596] to-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.6)] border-0 scale-110"
                      : "bg-[#121212] border border-white/15 text-white/40 group-hover:text-white/80 group-hover:border-white/30"
                    }
                  `}
                  >
                    {index + 1}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 pl-0.5">
                    <span className={`block truncate transition-all duration-300 leading-snug ${isActive ? "font-bold text-[#d4af37] text-[15px]" : "font-medium text-white/70 text-sm group-hover:text-white"}`}>
                      {era.name}
                    </span>
                    <span className={`block text-[11px] truncate transition-all duration-300 mt-0.5 tracking-wide ${isActive ? "text-[#d4af37]/70 font-medium" : "text-white/40"}`}>
                      {era.period}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
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
      <div className="h-[3px] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37]/50 to-[#d4af37]/80 transition-all duration-500"
          style={{ width: `${((activeIndex + 1) / eras.length) * 100}%` }}
        />
      </div>
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
function EraSection({ era, index, eras, keyContentsLabel }: { era: HistoryEra; index: number; eras: HistoryEra[]; keyContentsLabel: string }) {
  const prevEra = index > 0 ? eras[index - 1] : null;
  const nextEra = index < eras.length - 1 ? eras[index + 1] : null;

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section id={`era-${era.id}`} className="relative scroll-mt-4">
      {index > 0 && (
        <div className="flex items-center justify-center py-10 sm:py-16 md:py-20">
          <div className="w-px h-12 sm:h-16 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
        </div>
      )}

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

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
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

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pb-3"
        >
          <h4 className="text-[10px] sm:text-xs text-white/30 uppercase tracking-widest mb-1.5 sm:mb-2 font-semibold">{keyContentsLabel}</h4>
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
interface MuseumTimelineProps {
  eras?: HistoryEra[];
  categoryId?: string;
}

export default function MuseumTimeline({
  eras: erasProp,
  categoryId: categoryIdProp = "book",
}: MuseumTimelineProps) {
  const locale = useLocale();
  const t = useTranslations("scriptures.museum");
  const data = useMemo(() => getScripturesData(locale), [locale]);

  const [activeCategoryId, setActiveCategoryId] = useState(categoryIdProp);
  const activeCategory = MUSEUM_CATEGORY_IDS.find((c) => c.id === activeCategoryId);
  const subIds = activeCategory?.subCategories;
  const [activeSubId, setActiveSubId] = useState(subIds?.[0]?.id ?? "");

  const validSubId = subIds?.some((s) => s.id === activeSubId)
    ? activeSubId
    : subIds?.[0]?.id ?? "";

  useEffect(() => {
    const subs = MUSEUM_CATEGORY_IDS.find((c) => c.id === activeCategoryId)?.subCategories;
    setActiveSubId(subs?.[0]?.id ?? "");
  }, [activeCategoryId]);

  const timelineKey = subIds ? `${activeCategoryId}/${validSubId}` : activeCategoryId;
  const viewType = SUB_CATEGORY_VIEW_TYPE[timelineKey] ?? 'timeline';
  const eras = erasProp ?? data.timelines[timelineKey] ?? data.defaultTimeline;
  const [activeEraId, setActiveEraId] = useState(eras[0]?.id ?? "");
  const contentTopRef = useRef<HTMLDivElement>(null);

  const description = subIds
    ? t(`sub.${activeCategoryId}.${validSubId}.description`)
    : t(`category.${activeCategoryId}.description`);

  useEffect(() => {
    setActiveEraId(eras[0]?.id ?? "");
  }, [activeCategoryId, validSubId]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const trigger = window.innerHeight * 0.3;
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
      {viewType === 'timeline' && <TableOfContents activeId={activeEraId} eras={eras} contentTopRef={contentTopRef} />}
      {viewType === 'timeline' && <MobileNavigator activeId={activeEraId} eras={eras} />}

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
            {t("pageTitle")}
          </h1>
          <p className="text-white/60 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
            {description ?? t("defaultDescription")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <CategoryTabs activeId={activeCategoryId} onChange={setActiveCategoryId} />
          {subIds && subIds.length > 1 && (
            <SubCategoryTabs categoryId={activeCategoryId} subIds={subIds} activeId={validSubId} onChange={setActiveSubId} />
          )}
        </motion.div>
      </div>

      {viewType === 'timeline' && (
        <>
          <div className="px-4 sm:px-0">
            <EraGanttChart key={timelineKey} eras={eras} />
          </div>
          <div ref={contentTopRef} className="flex flex-col">
            {eras.map((era, index) => (
              <EraSection key={era.id} era={era} index={index} eras={eras} keyContentsLabel={t("keyContents")} />
            ))}
          </div>
        </>
      )}
      {viewType === 'catalog' && <TypographyCatalog data={data.typographyClasses} />}
    </div>
  );
}
// #endregion
