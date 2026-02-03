/*
  파일명: /app/(main)/scriptures/sage/page.tsx
  기능: 오늘의 인물 페이지
  책임: 매일 새로운 인물의 서재를 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import SageSection from "@/components/features/scriptures/sections/SageSection";
import { getTodaySage } from "@/actions/scriptures";
import { getScripturesPageTitle } from "@/constants/scriptures";

export const metadata = { title: getScripturesPageTitle("sage") };

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      {/* SectionHeader 스켈레톤 */}
      <div className="text-center py-6 sm:py-8 mb-6">
        <div className="flex items-center justify-center gap-4 mb-3 opacity-60">
          <div className="h-[1px] w-8 sm:w-12 bg-bg-card" />
          <div className="w-1.5 h-1.5 rotate-45 bg-bg-card" />
          <div className="h-[1px] w-8 sm:w-12 bg-bg-card" />
        </div>
        <div className="h-3 w-24 bg-bg-card rounded mx-auto mb-2" />
        <div className="h-8 w-28 bg-bg-card rounded mx-auto mb-3" />
        <div className="h-4 w-64 bg-bg-card rounded mx-auto" />
        <div className="mt-6 w-24 h-[1px] mx-auto bg-bg-card" />
      </div>

      {/* DecorativeLabel 스켈레톤 */}
      <div className="mb-4 flex justify-center">
        <div className="h-4 w-20 bg-bg-card rounded" />
      </div>

      {/* SagePlaque 스켈레톤 (가로형 명판) */}
      <div className="mb-8 relative bg-neutral-900/80 rounded-2xl border border-white/10 p-6 md:p-10">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* 아바타 */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-bg-card" />
          {/* 텍스트 정보 */}
          <div className="flex-1 text-center sm:text-left space-y-3 w-full">
            <div className="h-3 w-24 bg-bg-card rounded mx-auto sm:mx-0" />
            <div className="h-10 w-40 bg-bg-card rounded mx-auto sm:mx-0" />
            <div className="h-4 w-full max-w-md bg-bg-card rounded mx-auto sm:mx-0" />
            <div className="h-4 w-32 bg-bg-card rounded mx-auto sm:mx-0" />
          </div>
        </div>
      </div>

      {/* DecorativeLabel 스켈레톤 */}
      <div className="mb-4 flex justify-center">
        <div className="h-4 w-20 bg-bg-card rounded" />
      </div>

      {/* 카드 그리드 스켈레톤 */}
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
