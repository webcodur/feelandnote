/*
  파일명: /app/(main)/library/academy/[category]/[course]/page.tsx
  기능: 학당 코스 페이지
  책임: 카테고리/코스 파라미터를 검증하고 AcademyLessonView를 렌더링한다.
  참고: 제목 + 카테고리탭은 [category]/layout.tsx에서 처리.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import AcademyLessonView from "@/components/features/library/academy/AcademyLessonView";
import { getAcademyLessonProgressState } from "@/actions/library/academyProgress";
import { ACADEMY_CATEGORY_IDS } from "@/constants/libraryMuseum";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; course: string }>;
}) {
  const { category, course } = await params;
  const t = await getTranslations("library.academy");

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
    redirect(`/${locale}/library/academy`);
  }

  const validCourse = cat.courses.some((c) => c.id === course);
  if (!validCourse) {
    redirect(`/${locale}/library/academy/${cat.id}/${cat.courses[0].id}`);
  }

  return <LessonContent categoryId={category} courseId={course} />;
}
