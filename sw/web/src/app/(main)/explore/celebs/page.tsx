/*
  파일명: /app/(main)/explore/celebs/page.tsx
  기능: 셀럽 탐색 페이지
  책임: 셀럽 목록을 필터링하여 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import CelebsSection from "@/components/features/user/explore/sections/CelebsSection";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts, getGenderCounts, getFeaturedTags } from "@/actions/home";

export const dynamic = "force-dynamic";
export const metadata = { title: "셀럽 | 탐색" };

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      {/* PC 컨트롤 패널 스켈레톤 */}
      <div className="hidden md:flex justify-center my-12">
        <div className="inline-grid w-full max-w-2xl border border-white/10 bg-black/40 rounded-lg overflow-hidden">
          {/* 타이틀 바 */}
          <div className="flex items-center justify-center gap-3 px-6 py-2 bg-white/5 border-b border-white/5">
            <div className="h-[1px] w-12 bg-bg-card" />
            <div className="h-5 w-20 bg-bg-card rounded" />
            <div className="h-[1px] w-12 bg-bg-card" />
          </div>
          {/* 1행: 필터 */}
          <div className="flex items-center justify-center gap-2 px-6 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-bg-card rounded-md" />
            ))}
          </div>
          {/* 2행: 검색/버튼 */}
          <div className="flex items-center gap-2 px-6 py-3">
            <div className="flex-1 h-9 bg-bg-card rounded-md" />
            <div className="h-9 w-9 bg-bg-card rounded-md" />
            <div className="w-px h-5 bg-white/10" />
            <div className="h-9 w-16 bg-bg-card rounded-md" />
            <div className="h-9 w-16 bg-bg-card rounded-md" />
          </div>
        </div>
      </div>

      {/* 모바일 컨트롤 스켈레톤 */}
      <div className="md:hidden mb-6">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="flex-1 h-10 bg-bg-card rounded-md" />
          <div className="h-10 w-10 bg-bg-card rounded-md" />
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-bg-card rounded-lg shrink-0" />
          ))}
        </div>
      </div>

      {/* 셀럽 그리드 스켈레톤 (13/19 비율) */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 md:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[13/19] bg-bg-card rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function CelebsContent() {
  const [celebsResult, professionCounts, nationalityCounts, contentTypeCounts, genderCounts, featuredTags] = await Promise.all([
    getCelebs({ page: 1, limit: 24, minContentCount: 1, sortBy: "content_count" }),
    getProfessionCounts(),
    getNationalityCounts(),
    getContentTypeCounts(),
    getGenderCounts(),
    getFeaturedTags(),
  ]);

  return (
    <CelebsSection
      initialCelebs={celebsResult.celebs}
      initialTotal={celebsResult.total}
      initialTotalPages={celebsResult.totalPages}
      professionCounts={professionCounts}
      nationalityCounts={nationalityCounts}
      contentTypeCounts={contentTypeCounts}
      genderCounts={genderCounts}
      featuredTags={featuredTags}
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
