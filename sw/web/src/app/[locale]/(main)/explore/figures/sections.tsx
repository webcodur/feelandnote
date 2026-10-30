/*
  파일명: /app/(main)/explore/figures/sections.tsx
  기능: 인물 목록 화면 구획 — 통계 줄 · 목록(기본 뷰) · 필터 결과(그리드 뷰)
  책임: 구획마다 자기 조회만 하고, 실패하면 제자리에 다시 시도를 세운다.
        Lane 안에서 그려지므로 여기서 던지면 안 된다 — 완성 HTML 모드에서 화면 전체가 죽는다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import {
  getCelebs,
  getProfessionCounts,
  getNationalityCounts,
  getContentTypeCounts,
  getGenderCounts,
  getCelebsByProfession,
} from "@/actions/home";
import type { CelebSortBy } from "@/actions/home";
import type { CelebContentPresence } from "@/constants/celebContentPresence";
import type { TrendCountry } from "@/constants/trendCountries";
import { type CelebTier, type CelebReality } from "@feelandnote/shared/constants/celeb-tiers";
import CelebsSection from "@/components/features/user/explore/sections/CelebsSection";
import CelebsByProfession from "@/components/features/user/explore/sections/CelebsByProfession";
import CelebStatsBar from "@/components/features/user/explore/sections/CelebStatsBar";
import { RetryBlock } from "@/components/ui/pending";
import { fetchCountries } from "@/lib/countries";

/** 자료가 정말 0건인 구획 — 자리는 남기고 한 줄만 둔다 */
async function EmptyLine() {
  const t = await getTranslations("pending");
  return <p className="text-sm text-text-secondary text-center py-8">{t("empty")}</p>;
}

/* 통계 줄 — 카운트 4종. 인물 캐러셀(목록)과 별도 레인이라 이 조회가 늦어도 목록은 먼저 뜬다 */
export async function FiguresStatsBar() {
  let counts: [
    Awaited<ReturnType<typeof getProfessionCounts>>,
    Awaited<ReturnType<typeof getNationalityCounts>>,
    Awaited<ReturnType<typeof getContentTypeCounts>>,
    Awaited<ReturnType<typeof getGenderCounts>>,
  ];
  try {
    counts = await Promise.all([
      getProfessionCounts(),
      getNationalityCounts(),
      getContentTypeCounts(),
      getGenderCounts(),
    ]);
  } catch (e) {
    console.error("[FiguresPage] 통계 줄 조회 실패:", e);
    return <RetryBlock />;
  }

  // JSX 생성은 try 밖에서 한다 — try 안 JSX는 렌더 오류를 못 잡으면서 린트만 문다
  const [professionCounts, nationalityCounts, contentTypeCounts, genderCounts] = counts;
  return (
    <CelebStatsBar
      professionCounts={professionCounts}
      nationalityCounts={nationalityCounts}
      contentTypeCounts={contentTypeCounts}
      genderCounts={genderCounts}
    />
  );
}

/* 목록(기본 뷰) — 직군별 캐러셀. 값비싼 팬아웃 조회라 캐시로 감싼 함수를 쓴다 */
export async function FiguresList() {
  let sections: Awaited<ReturnType<typeof getCelebsByProfession>>;
  try {
    sections = await getCelebsByProfession();
  } catch (e) {
    console.error("[FiguresPage] 인물 목록 조회 실패:", e);
    return <RetryBlock />;
  }

  if (sections.length === 0) return <EmptyLine />;
  return <CelebsByProfession sections={sections} />;
}

export interface FiguresFilterParams {
  page: number;
  pageSize: number;
  sortBy: CelebSortBy;
  trendCountry?: TrendCountry;
  profession?: string;
  nationality?: string;
  contentType?: string;
  contentPresence?: CelebContentPresence;
  gender?: string;
  search?: string;
  factionId?: string;
  tiers?: readonly CelebTier[];
  realities?: readonly CelebReality[];
  birthYearMin?: number;
  birthYearMax?: number;
}

// 선택지별 숫자는 집계하지 않는다. 국적 선택지는 국가 코드 목록을 쓴다.
export async function FiguresFilterResult({ params }: { params: FiguresFilterParams }) {
  let celebsResult: Awaited<ReturnType<typeof getCelebs>>;
  try {
    celebsResult = await getCelebs({
      ...params,
      limit: params.pageSize,
      minContentCount: 0,
    });
  } catch (e) {
    console.error("[FiguresPage] 필터 결과 조회 실패:", e);
    return <RetryBlock />;
  }
  if (celebsResult.error) return <RetryBlock />;
  const countries = await fetchCountries({ includeHistorical: true });
  return (
    <div className="space-y-6 md:space-y-8">
      <CelebsSection
        initialCelebs={celebsResult.celebs}
        initialTotal={celebsResult.total}
        initialTotalPages={celebsResult.totalPages}
        initialTrendCountry={params.trendCountry}
        initialTrend={celebsResult.trend}
        nationalityOptions={countries.map(country => country.code)}
      />
    </div>
  );
}
