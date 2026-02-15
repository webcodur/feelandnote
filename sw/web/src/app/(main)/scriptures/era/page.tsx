/*
  파일명: /app/(main)/scriptures/era/page.tsx
  기능: 불후의 명작 페이지 (통합)
  책임: 전체 시대 + 시대별 인물들의 선택을 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import EraSection from "@/components/features/scriptures/sections/EraSection";
import { getScripturesByEra, getChosenScriptures, getTopCelebsAcrossAllEras } from "@/actions/scriptures";

export const metadata = {
  title: "불후의 명작 | 지혜의 서고",
  description: "전 시대의 대표작과 시대별 명저를 만나보세요.",
};

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
        <div className="h-3 w-28 bg-bg-card rounded mx-auto mb-2" />
        <div className="h-8 w-28 bg-bg-card rounded mx-auto mb-3" />
        <div className="h-4 w-56 bg-bg-card rounded mx-auto" />
        <div className="mt-6 w-24 h-[1px] mx-auto bg-bg-card" />
      </div>

      {/* 탭 스켈레톤 */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex p-1.5 bg-neutral-900/80 rounded-xl border border-white/10 gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 w-24 bg-bg-card rounded-lg" />
          ))}
        </div>
      </div>

      {/* 카드 그리드 스켈레톤 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function EraContent() {
  const eraData = await getScripturesByEra();
  const chosenData = await getChosenScriptures({ page: 1, limit: 12 });
  const topCelebs = await getTopCelebsAcrossAllEras();

  return <EraSection initialEraData={eraData} initialChosenData={chosenData} topCelebsAcrossAllEras={topCelebs} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <EraContent />
    </Suspense>
  );
}
