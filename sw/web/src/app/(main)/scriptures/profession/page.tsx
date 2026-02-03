/*
  파일명: /app/(main)/scriptures/profession/page.tsx
  기능: 길의 갈래 페이지
  책임: 분야별 인물들의 필독서를 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import ProfessionSection from "@/components/features/scriptures/sections/ProfessionSection";
import { getProfessionContentCounts } from "@/actions/scriptures";
import { getScripturesPageTitle } from "@/constants/scriptures";

export const metadata = { title: getScripturesPageTitle("profession") };

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
        <div className="h-3 w-32 bg-bg-card rounded mx-auto mb-2" />
        <div className="h-8 w-24 bg-bg-card rounded mx-auto mb-3" />
        <div className="h-4 w-72 bg-bg-card rounded mx-auto" />
        <div className="mt-6 w-24 h-[1px] mx-auto bg-bg-card" />
      </div>

      {/* DecorativeLabel 스켈레톤 */}
      <div className="-mt-2 mb-4 flex justify-center">
        <div className="h-4 w-16 bg-bg-card rounded" />
      </div>

      {/* 3행 탭 구조 스켈레톤 */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex flex-col items-center gap-1.5 p-2.5 bg-neutral-900/80 rounded-xl border border-white/10">
          <div className="inline-flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-14 bg-bg-card rounded-lg" />
            ))}
          </div>
          <div className="inline-flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-16 bg-bg-card rounded-lg" />
            ))}
          </div>
          <div className="inline-flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-14 bg-bg-card rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* 대표 인물 스켈레톤 */}
      <div className="mb-10 sm:mb-14">
        <div className="flex justify-center gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-bg-card" />
              <div className="h-4 w-16 bg-bg-card rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* DecorativeLabel 스켈레톤 */}
      <div className="mb-6 flex justify-center">
        <div className="h-4 w-16 bg-bg-card rounded" />
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

async function ProfessionContent() {
  const professionCounts = await getProfessionContentCounts();
  return <ProfessionSection professionCounts={professionCounts} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <ProfessionContent />
    </Suspense>
  );
}
