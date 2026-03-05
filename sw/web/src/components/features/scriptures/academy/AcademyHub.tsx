/*
  파일명: /components/features/scriptures/academy/AcademyHub.tsx
  기능: 서고 학당 허브 뷰
  책임: ACADEMY_CATEGORY_IDS 기반 카테고리탭 + 뷰 분기 (독서법 비교 / 화성학 레슨)
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { getScripturesData, ACADEMY_CATEGORY_IDS, SUB_CATEGORY_VIEW_TYPE } from "@/constants/scripturesMuseum";
import ReadingComparison from "./ReadingComparison";
import HarmonyLesson from "./HarmonyLesson";
import { useEffect, useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

// #region 카테고리 탭
function CategoryTabs({ activeId, onChange }: { activeId: string; onChange: (id: string) => void }) {
  const t = useTranslations("scriptures.academy.category");
  return (
    <div className="flex justify-center overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1 min-w-max">
        {ACADEMY_CATEGORY_IDS.map((cat) => {
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

// #region 메인 컴포넌트
export default function AcademyHub() {
  const locale = useLocale();
  const t = useTranslations("scriptures.academy");
  const data = useMemo(() => getScripturesData(locale), [locale]);

  const [activeCategoryId, setActiveCategoryId] = useState<string>(ACADEMY_CATEGORY_IDS[0].id);
  const activeCategory = ACADEMY_CATEGORY_IDS.find((c) => c.id === activeCategoryId);
  const subIds = activeCategory?.subCategories;
  const [activeSubId, setActiveSubId] = useState(subIds?.[0]?.id ?? "");

  useEffect(() => {
    const subs = ACADEMY_CATEGORY_IDS.find((c) => c.id === activeCategoryId)?.subCategories;
    setActiveSubId(subs?.[0]?.id ?? "");
  }, [activeCategoryId]);

  const validSubId = subIds?.some((s) => s.id === activeSubId)
    ? activeSubId
    : subIds?.[0]?.id ?? "";

  const viewKey = `${activeCategoryId}/${validSubId}`;
  const viewType = SUB_CATEGORY_VIEW_TYPE[viewKey] ?? 'comparison';

  const description = t(`sub.${activeCategoryId}.${validSubId}.description`);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 sm:py-12 md:py-20 pb-24 sm:pb-28 xl:pb-20">
      {/* 페이지 헤더 */}
      <div className="mb-6 sm:mb-10 md:mb-12 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center justify-center space-x-2 border border-white/10 bg-white/5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-4 sm:mb-6">
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
            <span className="text-[10px] sm:text-xs text-white/80 font-medium tracking-widest uppercase">Academy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white mb-3 sm:mb-4 leading-tight">
            {t("pageTitle")}
          </h1>
          <p className="text-white/60 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
            {description ?? t("defaultDescription")}
          </p>
        </motion.div>

        {/* 카테고리 탭 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <CategoryTabs activeId={activeCategoryId} onChange={setActiveCategoryId} />
        </motion.div>
      </div>

      {/* 뷰 분기 */}
      {viewType === 'comparison' && <ReadingComparison data={data.readingMethods} />}
      {viewType === 'lesson' && <HarmonyLesson data={data.harmonyLessons} />}
    </div>
  );
}
// #endregion
