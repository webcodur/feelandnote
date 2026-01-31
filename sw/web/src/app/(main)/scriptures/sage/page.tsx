/*
  파일명: /app/(main)/scriptures/sage/page.tsx
  기능: 오늘의 인물 페이지
  책임: 매일 새로운 인물의 서재를 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import SageSection from "@/components/features/scriptures/sections/SageSection";
import { getTodaySage } from "@/actions/scriptures";

export const metadata = { title: "오늘의 인물 | 지혜의 서고" };

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-start gap-4 p-4 mb-6 bg-bg-card/50 rounded-xl">
        <div className="w-16 h-16 rounded-full bg-bg-card shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 bg-bg-card rounded" />
          <div className="h-4 w-20 bg-bg-card rounded" />
          <div className="h-4 w-full bg-bg-card rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function SageContent() {
  const sageData = await getTodaySage();
  return <SageSection initialData={sageData} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <SageContent />
    </Suspense>
  );
}
