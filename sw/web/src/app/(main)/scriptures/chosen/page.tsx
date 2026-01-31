/*
  파일명: /app/(main)/scriptures/chosen/page.tsx
  기능: 인물들의 선택 페이지
  책임: 가장 많은 인물이 감상한 경전을 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import ChosenSection from "@/components/features/scriptures/sections/ChosenSection";
import { getChosenScriptures } from "@/actions/scriptures";

export const metadata = { title: "인물들의 선택 | 지혜의 서고" };

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-center mb-6">
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-16 bg-bg-card rounded" />
          ))}
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
