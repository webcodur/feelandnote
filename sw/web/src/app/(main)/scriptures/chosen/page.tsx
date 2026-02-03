/*
  파일명: /app/(main)/scriptures/chosen/page.tsx
  기능: 공통 서가 페이지
  책임: 가장 많은 인물이 감상한 경전을 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import ChosenSection from "@/components/features/scriptures/sections/ChosenSection";
import { getChosenScriptures } from "@/actions/scriptures";
import { getScripturesPageTitle } from "@/constants/scriptures";

export const metadata = { title: getScripturesPageTitle("chosen") };

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
        <div className="h-8 w-32 bg-bg-card rounded mx-auto mb-3" />
        <div className="h-4 w-64 bg-bg-card rounded mx-auto" />
        <div className="mt-6 w-24 h-[1px] mx-auto bg-bg-card" />
      </div>

      {/* DecorativeLabel 스켈레톤 */}
      <div className="-mt-2 mb-4 flex justify-center">
        <div className="h-4 w-20 bg-bg-card rounded" />
      </div>

      {/* 카테고리 탭 스켈레톤 */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex p-1 bg-neutral-900/80 rounded-xl border border-white/10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-14 bg-bg-card rounded-lg mx-0.5" />
          ))}
        </div>
      </div>

      {/* DecorativeLabel 스켈레톤 */}
      <div className="mb-4 flex justify-center">
        <div className="h-4 w-16 bg-bg-card rounded" />
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

async function ChosenContent() {
  const initialChosen = await getChosenScriptures({ page: 1, limit: 12 });
  return <ChosenSection initialData={initialChosen} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <ChosenContent />
    </Suspense>
  );
}
