/*
  파일명: /app/(main)/scriptures/academy/page.tsx
  기능: 지혜의 서고 - 학당 페이지
  책임: AcademyHub 컴포넌트를 호출하여 교육 콘텐츠를 표시한다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import AcademyHub from "@/components/features/scriptures/academy/AcademyHub";
import { getAcademyLessonProgressState } from "@/actions/scriptures/academyProgress";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.academy");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

async function AcademyContent() {
  const { isSignedIn, progress } = await getAcademyLessonProgressState();

  return (
    <AsyncIntlProvider>
      <AcademyHub initialLessonProgress={progress} isSignedIn={isSignedIn} />
    </AsyncIntlProvider>
  );
}

export default function AcademyPage() {
  return (
    <div className="w-full pb-20">
      <Suspense fallback={
        <div className="w-full flex justify-center py-32">
           <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
        </div>
      }>
        <AcademyContent />
      </Suspense>
    </div>
  );
}
