/*
  파일명: /app/(main)/explore/similar/page.tsx
  기능: 취향 유사 유저 탐색 페이지
  책임: 취향이 유사한 유저 목록을 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import SimilarSection from "@/components/features/user/explore/sections/SimilarSection";
import { getSimilarUsers } from "@/actions/user";

export const metadata = { title: "취향 유사 | 탐색" };

function SectionSkeleton() {
  return (
    <div className="animate-pulse bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10">
      <div className="hidden sm:grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square bg-bg-card rounded-xl" />
        ))}
      </div>
      <div className="sm:hidden flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-card rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function SimilarContent() {
  const result = await getSimilarUsers(10);
  return <SimilarSection similarUsers={result.users} algorithm={result.algorithm} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <SimilarContent />
    </Suspense>
  );
}
