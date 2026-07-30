/*
  파일명: /components/features/scriptures/academy/AcademyLessonView.tsx
  기능: 학당 레슨 뷰 (코스탭 + 레슨 본문)
  책임: 제목/카테고리탭은 layout에서 처리. 코스탭 + 설명 + HarmonyLesson을 렌더링한다.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";
import { ACADEMY_CATEGORY_IDS, ACADEMY_CONTENT_FILTERS, getScripturesData } from "@/constants/scripturesMuseum";
import HarmonyLesson from "./HarmonyLesson";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AcademyLessonProgress } from "@/types/academy";

// #region 코스 탭 (Link 기반)
function CourseTabs({
  categoryId,
  courses,
  activeId,
  progressMap,
}: {
  categoryId: string;
  courses: readonly { id: string }[];
  activeId: string;
  progressMap: Record<string, { completed: number; total: number }>;
}) {
  const t = useTranslations(`scriptures.academy.course.${categoryId}`);
  const academyT = useTranslations("scriptures.academy");

  return (
    <div className="flex justify-center mt-3 sm:mt-4">
      <div
        aria-label={academyT("courseTabsLabel")}
        className="inline-flex p-0.5 bg-white/[0.04] rounded-lg border border-white/[0.06] gap-0.5"
        role="group"
      >
        {courses.map((course) => {
          const isActive = course.id === activeId;
          const progress = progressMap[course.id];
          return (
            <Link
              key={course.id}
              href={`/library/academy/${categoryId}/${course.id}`}
              className={`
                px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-200
                flex items-center gap-2
                ${isActive
                  ? "text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/20"
                  : "text-white/40 hover:text-white/70 border border-transparent"
                }
              `}
            >
              <span>{t(`${course.id}.label`)}</span>
              {progress && (
                <span className={`font-mono text-xs ${
                  progress.completed === progress.total && progress.total > 0
                    ? "text-emerald-400/70"
                    : isActive ? "text-[#d4af37]/50" : "text-white/25"
                }`}>
                  {progress.completed}/{progress.total}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
// #endregion

// #region 유틸
function getLessonSource(categoryId: string, data: ReturnType<typeof getScripturesData>) {
  if (categoryId === "video") return data.videoLessons;
  if (categoryId === "book") return data.bookLessons;
  if (categoryId === "ai") return data.aiLessons;
  return data.harmonyLessons;
}

function getProgressMap(progress: AcademyLessonProgress[]) {
  return progress.reduce<Record<string, AcademyLessonProgress>>((acc, item) => {
    acc[item.lessonId] = item;
    return acc;
  }, {});
}

function getCourseProgressMap(
  categoryId: string,
  courses: readonly { id: string }[],
  allLessons: { id: string }[],
  progressById: Record<string, AcademyLessonProgress>,
) {
  const map: Record<string, { completed: number; total: number }> = {};
  for (const course of courses) {
    const key = `${categoryId}/${course.id}` as keyof typeof ACADEMY_CONTENT_FILTERS;
    const filter = ACADEMY_CONTENT_FILTERS[key];
    const ids = filter && "lessonIds" in filter ? (filter.lessonIds as readonly string[]) : null;
    const lessons = ids ? allLessons.filter((l) => ids.includes(l.id)) : allLessons;
    map[course.id] = {
      completed: lessons.filter((l) => progressById[l.id]?.isCompleted).length,
      total: lessons.length,
    };
  }
  return map;
}
// #endregion

// #region 메인 컴포넌트
interface AcademyLessonViewProps {
  categoryId: string;
  courseId: string;
  initialLessonProgress: AcademyLessonProgress[];
  isSignedIn: boolean;
}

export default function AcademyLessonView({
  categoryId,
  courseId,
  initialLessonProgress,
  isSignedIn,
}: AcademyLessonViewProps) {
  const locale = useLocale();
  const t = useTranslations("scriptures.academy");
  const data = useMemo(() => getScripturesData(locale), [locale]);
  const [lessonProgressById, setLessonProgressById] = useState<Record<string, AcademyLessonProgress>>(
    () => getProgressMap(initialLessonProgress),
  );

  const activeCategory = ACADEMY_CATEGORY_IDS.find((c) => c.id === categoryId) ?? ACADEMY_CATEGORY_IDS[0];
  const courses = activeCategory.courses;

  const handleLessonProgressChange = (progress: AcademyLessonProgress) => {
    setLessonProgressById((prev) => ({ ...prev, [progress.lessonId]: progress }));
  };

  const viewKey = `${categoryId}/${courseId}`;
  const viewFilters = ACADEMY_CONTENT_FILTERS[viewKey as keyof typeof ACADEMY_CONTENT_FILTERS];
  const lessonIds: readonly string[] | null = viewFilters && "lessonIds" in viewFilters ? viewFilters.lessonIds : null;
  const allLessons = getLessonSource(categoryId, data);
  const lessons = lessonIds
    ? allLessons.filter((lesson) => lessonIds.includes(lesson.id))
    : allLessons;

  const description = t(`course.${categoryId}.${courseId}.description`);

  const courseProgressMap = useMemo(
    () => getCourseProgressMap(categoryId, courses, allLessons, lessonProgressById),
    [categoryId, courses, allLessons, lessonProgressById],
  );

  return (
    <div className="pb-24 sm:pb-28 xl:pb-20">
      {/* 코스 탭 + 설명 */}
      <div className="mb-6 sm:mb-10 md:mb-12 text-center px-4">
        {courses.length > 1 ? (
          <CourseTabs categoryId={categoryId} courses={courses} activeId={courseId} progressMap={courseProgressMap} />
        ) : (
          <div className="flex justify-center">
            <span className="px-3.5 py-2 rounded-md text-sm font-medium text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center gap-2">
              <span>{t(`course.${categoryId}.${courseId}.label`)}</span>
              {courseProgressMap[courseId] && (
                <span className={`font-mono text-xs ${
                  courseProgressMap[courseId].completed === courseProgressMap[courseId].total && courseProgressMap[courseId].total > 0
                    ? "text-emerald-400/70"
                    : "text-[#d4af37]/50"
                }`}>
                  {courseProgressMap[courseId].completed}/{courseProgressMap[courseId].total}
                </span>
              )}
            </span>
          </div>
        )}
        <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mt-4 sm:mt-6 line-clamp-2">
          {description ?? t("defaultDescription")}
        </p>
      </div>

      <div aria-labelledby="academy-title" id="academy-content-panel" role="region">
        <HarmonyLesson
          categoryId={categoryId}
          courseId={courseId}
          data={lessons}
          isSignedIn={isSignedIn}
          key={viewKey}
          onProgressChange={handleLessonProgressChange}
          progressByLessonId={lessonProgressById}
        />
      </div>
    </div>
  );
}
// #endregion
