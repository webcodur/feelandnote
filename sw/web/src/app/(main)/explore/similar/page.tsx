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
    <div className="animate-pulse bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20">
      {/* 상단 버튼/라벨 영역 */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-4 w-24 bg-bg-card rounded" />
        <div className="h-5 w-20 bg-bg-card rounded-full" />
      </div>
      {/* PC Grid */}
      <div className="hidden sm:grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-bg-card" />
            <div className="h-3 w-12 bg-bg-card rounded" />
            <div className="h-2.5 w-14 bg-accent/10 rounded" />
          </div>
        ))}
      </div>
      {/* Mobile Compact List */}
      <div className="sm:hidden flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[58px] bg-bg-card border-2 border-accent-dim/10 rounded-sm flex items-center gap-3 px-2.5 py-3.5">
            <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 bg-white/10 rounded" />
              <div className="h-2 w-24 bg-accent/10 rounded" />
            </div>
            <div className="w-4 h-4 bg-white/5 rounded" />
          </div>
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
