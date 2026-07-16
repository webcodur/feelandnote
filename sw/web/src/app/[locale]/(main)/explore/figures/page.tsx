/*
  파일명: /app/(main)/explore/figures/page.tsx
  기능: 인물 목록 페이지
  책임: 인물 목록을 필터링하여 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import CelebsSection from "@/components/features/user/explore/sections/CelebsSection";
import CelebsByProfession from "@/components/features/user/explore/sections/CelebsByProfession";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts, getGenderCounts, getCelebsByProfession } from "@/actions/home";
import type { CelebSortBy } from "@/actions/home";
import { parseCelebTiers } from "@feelandnote/shared/constants/celeb-tiers";

export const revalidate = 3600;

export async function generateMetadata() {
  const t = await getTranslations("explore.celebs");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/figures"),
  };
}

const VALID_SORT_VALUES = ["daily_recommend", "composite", "influence", "follower", "content_count", "name_asc", "birth_date_desc", "birth_date_asc"];

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
  // 등급 필터. 미지정이면 getCelebs가 기본 등급(full·light)만 노출한다.
  const tiers = parseCelebTiers(parseParam(searchParams, "tier"));
  const tagId = parseParam(searchParams, "tagId");

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
      tagId: notAll(tagId),
      tiers,
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

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;

  if (isGridView(params)) {
    return <CelebsFilterContent searchParams={params} />;
  }

  return <CelebsCarouselContent />;
}
