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
    <div className="animate-pulse space-y-8">
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <div key={rowIndex}>
          <div className="h-5 w-32 bg-bg-card rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
            ))}
          </div>
        </div>
      ))}
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
