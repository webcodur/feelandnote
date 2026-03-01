/*
  파일명: /app/(main)/scriptures/history/page.tsx
  기능: 지혜의 서고 - 콘텐츠 역사 페이지
  책임: 타임라인 컴포넌트를 호출하여 역사 정보를 표시한다.
*/ // ------------------------------

import { Suspense } from "react";
import ContentHistoryTimeline from "@/components/features/scriptures/history/ContentHistoryTimeline";

export const metadata = {
  title: "콘텐츠 역사 | 지혜의 서고",
  description: "인류 지식 매체와 콘텐츠 형태의 변천사를 살펴봅니다.",
};

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
