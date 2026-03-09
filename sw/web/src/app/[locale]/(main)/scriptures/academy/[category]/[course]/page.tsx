/*
  파일명: /app/(main)/scriptures/academy/[category]/[course]/page.tsx
  기능: 학당 코스 페이지
  책임: 카테고리/코스 파라미터를 검증하고 AcademyLessonView를 렌더링한다.
  참고: 제목 + 카테고리탭은 [category]/layout.tsx에서 처리.
*/ // ------------------------------

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import AcademyLessonView from "@/components/features/scriptures/academy/AcademyLessonView";
import { getAcademyLessonProgressState } from "@/actions/scriptures/academyProgress";
import { ACADEMY_CATEGORY_IDS } from "@/constants/scripturesMuseum";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; course: string }>;
}) {
  const { category, course } = await params;
  const t = await getTranslations("scriptures.academy");

  const cat = ACADEMY_CATEGORY_IDS.find((c) => c.id === category);
  if (!cat || !cat.courses.some((c) => c.id === course)) {
    return { title: t("metaTitle"), description: t("metaDescription") };
  }

  const courseLabel = t(`course.${category}.${course}.label`);
  const catLabel = t(`category.${category}.label`);

  return {
    title: `${courseLabel} - ${catLabel} | ${t("metaTitle")}`,
    description: t(`course.${category}.${course}.description`),
  };
}

async function LessonContent({
  categoryId,
  courseId,
}: {
  categoryId: string;
  courseId: string;
}) {
  const { isSignedIn, progress } = await getAcademyLessonProgressState();

  return (
    <AsyncIntlProvider>
      <AcademyLessonView
        categoryId={categoryId}
        courseId={courseId}
        initialLessonProgress={progress}
        isSignedIn={isSignedIn}
      />
    </AsyncIntlProvider>
  );
}

export default async function AcademyCoursePage({
  params,
}: {
  params: Promise<{ locale: string; category: string; course: string }>;
}) {
  const { locale, category, course } = await params;

  // 유효성 검증
  const cat = ACADEMY_CATEGORY_IDS.find((c) => c.id === category);
  if (!cat) {
    redirect(`/${locale}/scriptures/academy`);
  }

  const validCourse = cat.courses.some((c) => c.id === course);
  if (!validCourse) {
    redirect(`/${locale}/scriptures/academy/${cat.id}/${cat.courses[0].id}`);
  }

  return (
    <Suspense
      fallback={
        <div className="w-full flex justify-center py-32">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
        </div>
      }
    >
      <LessonContent categoryId={category} courseId={course} />
    </Suspense>
  );
}
