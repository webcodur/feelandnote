/*
  파일명: /components/features/scriptures/academy/AcademyHub.tsx
  기능: 서고 학당 허브 뷰
  책임: ACADEMY_CATEGORY_IDS 기반 카테고리탭 + 뷰 분기 (독서법 비교 / 화성학 레슨)
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { getScripturesData, ACADEMY_CATEGORY_IDS, ACADEMY_CONTENT_FILTERS, SUB_CATEGORY_VIEW_TYPE } from "@/constants/scripturesMuseum";
import ReadingComparison from "./ReadingComparison";
import HarmonyLesson from "./HarmonyLesson";
import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AcademyLessonProgress } from "@/types/academy";

// #region 카테고리 탭
function CategoryTabs({ activeId, onChange }: { activeId: string; onChange: (id: string) => void }) {
  const t = useTranslations("scriptures.academy.category");
  const academyT = useTranslations("scriptures.academy");
  return (
    <div className="flex justify-center overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
      <div
        aria-label={academyT("categoryTabsLabel")}
        className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1 min-w-max"
        role="group"
      >
        {ACADEMY_CATEGORY_IDS.map((cat) => {
          const isActive = cat.id === activeId;
          return (
            <button
              aria-controls="academy-content-panel"
              aria-pressed={isActive}
              key={cat.id}
              onClick={() => onChange(cat.id)}
              type="button"
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
function SubCategoryTabs({
  categoryId,
  subIds,
  activeId,
  onChange,
}: {
  categoryId: string;
  subIds: readonly { id: string }[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const t = useTranslations(`scriptures.academy.sub.${categoryId}`);
  const academyT = useTranslations("scriptures.academy");

  return (
    <div className="flex justify-center mt-3 sm:mt-4">
      <div
        aria-label={academyT("subCategoryTabsLabel")}
        className="inline-flex p-0.5 bg-white/[0.04] rounded-lg border border-white/[0.06] gap-0.5"
        role="group"
      >
        {subIds.map((sub) => {
          const isActive = sub.id === activeId;
          return (
            <button
              aria-controls="academy-content-panel"
              aria-pressed={isActive}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${isActive
                  ? "text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/20"
                  : "text-white/40 hover:text-white/70 border border-transparent"
                }
              `}
              key={sub.id}
              onClick={() => onChange(sub.id)}
              type="button"
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
interface AcademyHubProps {
  initialLessonProgress: AcademyLessonProgress[];
  isSignedIn: boolean;
}

function getProgressMap(progress: AcademyLessonProgress[]) {
  return progress.reduce<Record<string, AcademyLessonProgress>>((acc, item) => {
    acc[item.lessonId] = item;
    return acc;
  }, {});
}

function getInitialAcademyView(progress: AcademyLessonProgress[]) {
  const latestLessonProgress = [...progress]
    .sort((a, b) => new Date(b.lastStudiedAt).getTime() - new Date(a.lastStudiedAt).getTime())[0];

  if (!latestLessonProgress) {
    const defaultCategory = ACADEMY_CATEGORY_IDS[0];
    return {
      categoryId: defaultCategory.id,
      subCategoryId: defaultCategory.subCategories?.[0]?.id ?? "",
    };
  }

  const category = ACADEMY_CATEGORY_IDS.find((item) => item.id === latestLessonProgress.categoryId);

  return {
    categoryId: category?.id ?? ACADEMY_CATEGORY_IDS[0].id,
    subCategoryId: category?.subCategories?.some((item) => item.id === latestLessonProgress.subCategoryId)
      ? latestLessonProgress.subCategoryId
      : category?.subCategories?.[0]?.id ?? "",
  };
}

export default function AcademyHub({ initialLessonProgress, isSignedIn }: AcademyHubProps) {
  const locale = useLocale();
  const t = useTranslations("scriptures.academy");
  const data = useMemo(() => getScripturesData(locale), [locale]);
  const initialView = useMemo(() => getInitialAcademyView(initialLessonProgress), [initialLessonProgress]);
  const [lessonProgressById, setLessonProgressById] = useState<Record<string, AcademyLessonProgress>>(
    () => getProgressMap(initialLessonProgress),
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>(initialView.categoryId);
  const activeCategory = ACADEMY_CATEGORY_IDS.find((c) => c.id === activeCategoryId);
  const subIds = activeCategory?.subCategories;
  const [activeSubId, setActiveSubId] = useState(initialView.subCategoryId || (subIds?.[0]?.id ?? ""));
  const handleCategoryChange = (nextCategoryId: string) => {
    const nextSubId = ACADEMY_CATEGORY_IDS.find((c) => c.id === nextCategoryId)?.subCategories?.[0]?.id ?? "";
    setActiveCategoryId(nextCategoryId);
    setActiveSubId(nextSubId);
  };
  const handleLessonProgressChange = (progress: AcademyLessonProgress) => {
    setLessonProgressById((prev) => ({
      ...prev,
      [progress.lessonId]: progress,
    }));
  };

  const validSubId = subIds?.some((s) => s.id === activeSubId)
    ? activeSubId
    : subIds?.[0]?.id ?? "";

  const viewKey = `${activeCategoryId}/${validSubId}`;
  const viewType = SUB_CATEGORY_VIEW_TYPE[viewKey] ?? 'comparison';
  const viewFilters = ACADEMY_CONTENT_FILTERS[viewKey as keyof typeof ACADEMY_CONTENT_FILTERS];
  const readingMethodIds: readonly string[] | null = viewFilters && "readingMethodIds" in viewFilters ? viewFilters.readingMethodIds : null;
  const lessonIds: readonly string[] | null = viewFilters && "lessonIds" in viewFilters ? viewFilters.lessonIds : null;
  const readingMethods = readingMethodIds
    ? data.readingMethods.filter((method) => readingMethodIds.includes(method.id))
    : data.readingMethods;
  const harmonyLessons = lessonIds
    ? data.harmonyLessons.filter((lesson) => lessonIds.includes(lesson.id))
    : data.harmonyLessons;

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
            <span className="text-[10px] sm:text-xs text-white/80 font-medium tracking-widest uppercase">{t("eyebrow")}</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white mb-3 sm:mb-4 leading-tight"
            id="academy-title"
          >
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
          <CategoryTabs activeId={activeCategoryId} onChange={handleCategoryChange} />
          {subIds && subIds.length > 0 && (
            <SubCategoryTabs categoryId={activeCategoryId} subIds={subIds} activeId={validSubId} onChange={setActiveSubId} />
          )}
        </motion.div>
      </div>

      <div aria-labelledby="academy-title" id="academy-content-panel" role="region">
        {viewType === 'comparison' && <ReadingComparison key={viewKey} data={readingMethods} />}
        {viewType === 'lesson' && (
          <HarmonyLesson
            categoryId={activeCategoryId}
            data={harmonyLessons}
            isSignedIn={isSignedIn}
            key={viewKey}
            onProgressChange={handleLessonProgressChange}
            progressByLessonId={lessonProgressById}
            subCategoryId={validSubId}
          />
        )}
      </div>
    </div>
  );
}
// #endregion
