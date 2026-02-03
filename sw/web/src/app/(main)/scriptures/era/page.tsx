/*
  파일명: /app/(main)/scriptures/era/page.tsx
  기능: 세대의 경전 페이지
  책임: 시대별 인물들의 선택을 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import EraSection from "@/components/features/scriptures/sections/EraSection";
import { getScripturesByEra } from "@/actions/scriptures";
import { getScripturesPageTitle } from "@/constants/scriptures";

export const metadata = { title: getScripturesPageTitle("era") };

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

      {/* 모바일: 시대 탭 + 콘텐츠 */}
      <div className="md:hidden mb-10 overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
        {/* DecorativeLabel: 시대 선택 */}
        <div className="flex justify-center mb-4">
          <div className="h-4 w-16 bg-bg-card rounded" />
        </div>
        {/* 시대 탭 */}
        <div className="flex justify-center min-w-max">
          <div className="inline-flex p-1 bg-neutral-900/80 rounded-xl border border-white/10 gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 w-14 bg-bg-card rounded-lg" />
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {/* 대표 인물 + 시대 설명 */}
          <div className="relative">
            <div className="flex justify-center gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-16 h-16 rounded-full bg-bg-card" />
              ))}
            </div>
            {/* 시대 설명 텍스트 */}
            <div className="mt-4 px-4 space-y-2">
              <div className="h-4 w-full bg-bg-card rounded mx-auto" />
              <div className="h-4 w-3/4 bg-bg-card rounded mx-auto" />
            </div>
          </div>

          {/* DecorativeLabel: 시대의 경전 */}
          <div>
            <div className="flex justify-center mb-4">
              <div className="h-4 w-20 bg-bg-card rounded" />
            </div>
            {/* 경전 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 데스크탑: 타임라인 형태 */}
      <div className="hidden md:block space-y-20 relative">
        <div className="absolute left-8 top-8 bottom-8 w-[2px] bg-bg-card opacity-30" />
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="relative pl-24">
            <div className="absolute left-[29px] top-4 w-2.5 h-2.5 rounded-full bg-bg-card" />
            <div className="mb-8 pb-4 border-b border-white/10">
              <div className="flex items-baseline gap-4">
                <div className="h-8 w-24 bg-bg-card rounded" />
                <div className="h-5 w-20 bg-bg-card rounded" />
              </div>
            </div>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3 space-y-4">
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-12 h-12 rounded-full bg-bg-card" />
                  ))}
                </div>
                <div className="h-16 bg-bg-card rounded" />
              </div>
              <div className="col-span-9 grid grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function EraContent() {
  const eraData = await getScripturesByEra();
  return <EraSection initialData={eraData} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <EraContent />
    </Suspense>
  );
}
