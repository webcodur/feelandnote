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
      <div className="flex gap-4 mb-6 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-bg-card rounded shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
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
