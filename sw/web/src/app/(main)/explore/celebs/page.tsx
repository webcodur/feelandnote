/*
  파일명: /app/(main)/explore/celebs/page.tsx
  기능: 셀럽 탐색 페이지
  책임: 셀럽 목록을 필터링하여 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import CelebsSection from "@/components/features/user/explore/sections/CelebsSection";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts, getTagCounts } from "@/actions/home";

export const metadata = { title: "셀럽 | 탐색" };

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-bg-card rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function CelebsContent() {
  const [celebsResult, professionCounts, nationalityCounts, contentTypeCounts, tagCounts] = await Promise.all([
    getCelebs({ page: 1, limit: 24, minContentCount: 1 }),
    getProfessionCounts(),
    getNationalityCounts(),
    getContentTypeCounts(),
    getTagCounts(),
  ]);

  return (
    <CelebsSection
      initialCelebs={celebsResult.celebs}
      initialTotal={celebsResult.total}
      initialTotalPages={celebsResult.totalPages}
      professionCounts={professionCounts}
      nationalityCounts={nationalityCounts}
      contentTypeCounts={contentTypeCounts}
      tagCounts={tagCounts}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <CelebsContent />
    </Suspense>
  );
}
