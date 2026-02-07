/*
  파일명: /app/(main)/explore/celebs/page.tsx
  기능: 셀럽 탐색 페이지
  책임: 셀럽 목록을 필터링하여 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import CelebsSection from "@/components/features/user/explore/sections/CelebsSection";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts, getGenderCounts, getFeaturedTags } from "@/actions/home";
import type { CelebSortBy } from "@/actions/home";

export const dynamic = "force-dynamic";
export const metadata = { title: "셀럽 | 탐색" };

const VALID_SORT_VALUES = ["influence", "follower", "content_count", "name_asc", "birth_date_desc", "birth_date_asc"];

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      {/* PC 컨트롤 패널 스켈레톤 */}
      <div className="hidden md:flex justify-center my-12">
        <div className="w-full max-w-2xl border border-white/10 bg-black/40 rounded-lg overflow-hidden">
          {/* 타이틀 바 */}
          <div className="flex items-center justify-center gap-3 px-6 py-2 bg-white/5 border-b border-white/5">
            <div className="h-[1px] w-12 bg-bg-card" />
            <div className="h-5 w-20 bg-bg-card rounded" />
            <div className="h-[1px] w-12 bg-bg-card" />
          </div>
          <div className="bg-black/20">
            {/* 1행: 필터 (5개) */}
            <div className="flex items-center justify-center gap-2 px-6 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 w-24 bg-bg-card rounded-md" />
              ))}
            </div>
            {/* 2행: 검색 + 버튼 3개 */}
            <div className="flex items-center gap-2 px-6 py-3">
              <div className="flex-1 h-9 bg-bg-card rounded-md" />
              <div className="h-9 w-9 bg-bg-card rounded-md" />
              <div className="w-px h-5 bg-white/10 mx-1" />
              <div className="h-9 w-[4.5rem] bg-bg-card rounded-md" />
              <div className="h-9 w-[4.5rem] bg-bg-card rounded-md" />
              <div className="h-9 w-[4.5rem] bg-bg-card rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 컨트롤 스켈레톤 */}
      <div className="md:hidden mb-10">
        <div className="border border-white/10 bg-black/40 rounded-lg overflow-hidden">
          {/* 타이틀 바 */}
          <div className="flex items-center justify-center gap-3 px-6 py-2 bg-white/5 border-b border-white/5">
            <div className="h-[1px] w-8 bg-bg-card" />
            <div className="h-5 w-20 bg-bg-card rounded" />
            <div className="h-[1px] w-8 bg-bg-card" />
          </div>
          {/* 1행: 필터칩 2x2 + 정렬 풀폭 */}
          <div className="grid grid-cols-2 gap-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 bg-bg-card rounded-lg" />
            ))}
            <div className="h-9 bg-bg-card rounded-lg col-span-2" />
          </div>
          {/* 2행: 검색 */}
          <div className="flex gap-2 p-3">
            <div className="flex-1 h-9 bg-bg-card rounded-md" />
            <div className="h-9 w-9 bg-bg-card rounded-md" />
          </div>
          {/* 3행: 추가 버튼들 */}
          <div className="h-px bg-accent/10" />
          <div className="flex gap-2 p-3">
            <div className="flex-1 h-9 bg-bg-card rounded-md" />
            <div className="flex-1 h-9 bg-bg-card rounded-md" />
            <div className="flex-1 h-9 bg-bg-card rounded-md" />
          </div>
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

// URL searchParams에서 필터/정렬 값 파싱
function parseParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

async function CelebsContent({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const profession = parseParam(searchParams, "profession");
  const nationality = parseParam(searchParams, "nationality");
  const contentType = parseParam(searchParams, "contentType");
  const gender = parseParam(searchParams, "gender");
  const search = parseParam(searchParams, "search");
  const sortByRaw = parseParam(searchParams, "sortBy");
  const sortBy = (sortByRaw && VALID_SORT_VALUES.includes(sortByRaw) ? sortByRaw : "content_count") as CelebSortBy;
  const pageRaw = parseInt(parseParam(searchParams, "page") || "1", 10);
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const notAll = (v?: string) => v && v !== "all" ? v : undefined;

  const [celebsResult, professionCounts, nationalityCounts, contentTypeCounts, genderCounts, featuredTags] = await Promise.all([
    getCelebs({
      page,
      limit: 24,
      minContentCount: 1,
      sortBy,
      profession: notAll(profession),
      nationality: notAll(nationality),
      contentType: notAll(contentType),
      gender: notAll(gender),
      search: search || undefined,
    }),
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

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <CelebsContent searchParams={params} />
    </Suspense>
  );
}
