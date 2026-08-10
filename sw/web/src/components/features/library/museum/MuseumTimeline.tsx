/*
  파일명: /components/features/library/museum/MuseumTimeline.tsx
  기능: 서고 전시관 타임라인 뷰
  책임: 카테고리/서브 탭 + 간트 차트 + 시대 섹션 + 네비게이터를 조합한다.
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import { getLibraryData, MUSEUM_CATEGORY_IDS, SUB_CATEGORY_VIEW_TYPE } from "@/constants/libraryMuseum";
import TypographyCatalog from "./TypographyCatalog";
import MuseumTableOfContents from "./MuseumTableOfContents";
import MuseumMobileNav from "./MuseumMobileNav";
import MuseumEraSection from "./MuseumEraSection";
import { useEffect, useState, useRef, useMemo } from "react";
import EraGanttChart from "./EraGanttChart";
import { useLocale, useTranslations } from "next-intl";

// #region 카테고리 탭
function CategoryTabs({ activeId, onChange }: { activeId: string; onChange: (id: string) => void }) {
  const t = useTranslations("library.museum.category");
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

// #region 서브 카테고리 탭
function SubCategoryTabs({ categoryId, subIds, activeId, onChange }: { categoryId: string; subIds: readonly { id: string }[]; activeId: string; onChange: (id: string) => void }) {
  const t = useTranslations(`library.museum.sub.${categoryId}`);
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
                px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-200
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

// #region 메인 컴포넌트
interface MuseumTimelineProps {
  eras?: import("@/constants/libraryMuseum").HistoryEra[];
  categoryId?: string;
  subCategoryId?: string;
}

export default function MuseumTimeline({
  eras: erasProp,
  categoryId: categoryIdProp = "book",
  subCategoryId: subCategoryIdProp,
}: MuseumTimelineProps) {
  const locale = useLocale();
  const t = useTranslations("library.museum");
  const data = useMemo(() => getLibraryData(locale), [locale]);

  const [activeCategoryId, setActiveCategoryId] = useState(categoryIdProp);
  const activeCategory = MUSEUM_CATEGORY_IDS.find((c) => c.id === activeCategoryId);
  const subIds = activeCategory?.subCategories;
  const [activeSubId, setActiveSubId] = useState(
    subCategoryIdProp && subIds?.some((s) => s.id === subCategoryIdProp)
      ? subCategoryIdProp
      : subIds?.[0]?.id ?? ""
  );

  const validSubId = subIds?.some((s) => s.id === activeSubId)
    ? activeSubId
    : subIds?.[0]?.id ?? "";

  // 갈래를 바꾸면 곁가지 선택을 그 갈래의 첫 항목으로 되돌린다.
  // 이펙트가 아니라 렌더 도중에 맞춘다(리액트 권장 패턴) — 이펙트로 하면 옛 곁가지가
  // 한 번 그려진 뒤에야 바뀌어 화면이 깜빡이고, 그리는 횟수도 늘어난다.
  const [lastCategoryId, setLastCategoryId] = useState(activeCategoryId);
  if (activeCategoryId !== lastCategoryId) {
    setLastCategoryId(activeCategoryId);
    setActiveSubId(subIds?.[0]?.id ?? "");
  }

  const timelineKey = subIds ? `${activeCategoryId}/${validSubId}` : activeCategoryId;
  const viewType = SUB_CATEGORY_VIEW_TYPE[timelineKey] ?? 'timeline';
  const eras = erasProp ?? data.timelines[timelineKey] ?? data.defaultTimeline;
  const [activeEraId, setActiveEraId] = useState(eras[0]?.id ?? "");
  const contentTopRef = useRef<HTMLDivElement>(null);

  const description = subIds
    ? t(`sub.${activeCategoryId}.${validSubId}.description`)
    : t(`category.${activeCategoryId}.description`);

  // 보고 있는 연표가 바뀌면 펼친 시대도 첫 시대로 되돌린다(위와 같은 이유로 렌더 중 조정).
  const [lastTimelineKey, setLastTimelineKey] = useState(timelineKey);
  if (timelineKey !== lastTimelineKey) {
    setLastTimelineKey(timelineKey);
    setActiveEraId(eras[0]?.id ?? "");
  }

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
      {viewType === 'timeline' && <MuseumTableOfContents activeId={activeEraId} eras={eras} contentTopRef={contentTopRef} />}
      {viewType === 'timeline' && <MuseumMobileNav activeId={activeEraId} eras={eras} />}

      <div className="mb-6 sm:mb-10 md:mb-12 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white mb-3 sm:mb-4 leading-tight">
            {t("pageTitle")}
          </h2>
          <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8 line-clamp-2">
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
              <MuseumEraSection key={era.id} era={era} index={index} eras={eras} keyContentsLabel={t("keyContents")} />
            ))}
          </div>
        </>
      )}
      {viewType === 'catalog' && <TypographyCatalog data={data.typographyClasses} />}
    </div>
  );
}
// #endregion
