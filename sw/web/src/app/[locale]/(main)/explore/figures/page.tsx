/*
  파일명: /app/(main)/explore/figures/page.tsx
  기능: 인물 목록 페이지
  책임: 인물 목록을 필터링하여 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import CelebsSection from "@/components/features/user/explore/sections/CelebsSection";
import CelebsByProfession from "@/components/features/user/explore/sections/CelebsByProfession";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts, getGenderCounts, getCelebsByProfession } from "@/actions/home";
import type { CelebSortBy } from "@/actions/home";

export const revalidate = 300;

export async function generateMetadata() {
  const t = await getTranslations("explore.celebs");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/explore/figures"),
  };
}

const VALID_SORT_VALUES = ["daily_recommend", "composite", "influence", "follower", "content_count", "name_asc", "birth_date_desc", "birth_date_asc"];

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      {/* PC 컨트롤 패널 스켈레톤 */}
      <div className="hidden md:block mb-6">
        {/* 1행: 검색 + 버튼 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 max-w-sm h-9 bg-bg-card rounded-lg" />
          <div className="h-9 w-9 bg-bg-card rounded-lg" />
        </div>
        {/* 2행: 필터 칩들 */}
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-bg-card rounded-md" />
          ))}
        </div>
      </div>

      {/* 모바일 컨트롤 스켈레톤 */}
      <div className="md:hidden mb-6">
        <div className="flex gap-2 mb-2">
          <div className="flex-1 h-9 bg-bg-card rounded-lg" />
          <div className="h-9 w-9 bg-bg-card rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 bg-bg-card rounded-lg" />
          ))}
          <div className="h-9 bg-bg-card rounded-lg col-span-2" />
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

// 그리드 뷰인지 판단: 필터 파라미터가 있으면 그리드
const FILTER_KEYS = ["profession", "nationality", "contentType", "gender", "search", "sortBy", "page", "pageSize", "tagId", "tier"];
function isGridView(params: Record<string, string | string[] | undefined>): boolean {
  return FILTER_KEYS.some((key) => {
    const v = params[key];
    return typeof v === "string" && v.length > 0;
  });
}

async function CelebsFilterContent({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const profession = parseParam(searchParams, "profession");
  const nationality = parseParam(searchParams, "nationality");
  const contentType = parseParam(searchParams, "contentType");
  const gender = parseParam(searchParams, "gender");
  const search = parseParam(searchParams, "search");
  const sortByRaw = parseParam(searchParams, "sortBy");
  const sortBy = (sortByRaw && VALID_SORT_VALUES.includes(sortByRaw) ? sortByRaw : "daily_recommend") as CelebSortBy;
  const pageRaw = parseInt(parseParam(searchParams, "page") || "1", 10);
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const pageSizeRaw = parseInt(parseParam(searchParams, "pageSize") || "24", 10);
  const pageSize = [12, 24, 48, 96].includes(pageSizeRaw) ? pageSizeRaw : 24;
  const tierRaw = parseParam(searchParams, "tier");
  const tier = (tierRaw === "full" || tierRaw === "light") ? tierRaw : undefined;

  const notAll = (v?: string) => v && v !== "all" ? v : undefined;

  const [celebsResult, professionCounts, nationalityCounts, contentTypeCounts, genderCounts] = await Promise.all([
    getCelebs({
      page,
      limit: pageSize,
      minContentCount: 0,
      sortBy,
      profession: notAll(profession),
      nationality: notAll(nationality),
      contentType: notAll(contentType),
      gender: notAll(gender),
      search: search || undefined,
      tier,
    }),
    getProfessionCounts(),
    getNationalityCounts(),
    getContentTypeCounts(),
    getGenderCounts(),
  ]);

  return (
    <AsyncIntlProvider>
      <CelebsSection
        initialCelebs={celebsResult.celebs}
        initialTotal={celebsResult.total}
        initialTotalPages={celebsResult.totalPages}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        genderCounts={genderCounts}
      />
    </AsyncIntlProvider>
  );
}

async function CelebsCarouselContent() {
  const [sections, professionCounts, nationalityCounts, contentTypeCounts, genderCounts] = await Promise.all([
    getCelebsByProfession(),
    getProfessionCounts(),
    getNationalityCounts(),
    getContentTypeCounts(),
    getGenderCounts(),
  ]);

  return (
    <AsyncIntlProvider>
      <CelebsByProfession
        sections={sections}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        genderCounts={genderCounts}
      />
    </AsyncIntlProvider>
  );
}

function CarouselSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="h-5 w-20 bg-bg-card rounded" />
            <div className="h-4 w-14 bg-bg-card rounded" />
          </div>
          <div className="flex gap-2 md:gap-3 overflow-hidden">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="flex-shrink-0 w-[28%] sm:w-[22%] md:w-[16%] lg:w-[13%] xl:w-[11%] 2xl:w-[9%]">
                <div className="aspect-[13/19] bg-bg-card rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;

  if (isGridView(params)) {
    return (
      <Suspense fallback={<SectionSkeleton />}>
        <CelebsFilterContent searchParams={params} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<CarouselSkeleton />}>
      <CelebsCarouselContent />
    </Suspense>
  );
}
