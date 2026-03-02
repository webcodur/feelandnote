/*
  파일명: /app/(main)/scriptures/history/page.tsx
  기능: 지혜의 서고 - 콘텐츠 역사 페이지
  책임: 타임라인 컴포넌트를 호출하여 역사 정보를 표시한다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import ContentHistoryTimeline from "@/components/features/scriptures/history/ContentHistoryTimeline";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.history");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function HistoryPage() {
  return (
    <div className="w-full pb-20">
      <Suspense fallback={
        <div className="w-full flex justify-center py-32">
           <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
        </div>
      }>
        <ContentHistoryTimeline />
      </Suspense>
    </div>
  );
}
