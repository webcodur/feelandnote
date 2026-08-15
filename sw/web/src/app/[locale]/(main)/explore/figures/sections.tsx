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
import type { CelebTier } from "@feelandnote/shared/constants/celeb-tiers";
import CelebsSection from "@/components/features/user/explore/sections/CelebsSection";
import CelebsByProfession from "@/components/features/user/explore/sections/CelebsByProfession";
import CelebStatsBar from "@/components/features/user/explore/sections/CelebStatsBar";
import { RetryBlock } from "@/components/ui/pending";

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
  profession?: string;
  nationality?: string;
  contentType?: string;
  gender?: string;
  search?: string;
  tagId?: string;
  tiers?: readonly CelebTier[];
}

/* 필터 결과(그리드 뷰) — 필터 줄과 목록이 같은 상호작용 상태(검색어·정렬·페이지)를 공유하는
   하나의 위젯이라 두 레인으로 쪼개지 않는다. 카운트 4종 + 목록을 함께 기다린다 */
export async function FiguresFilterResult({ params }: { params: FiguresFilterParams }) {
  let result: [
    Awaited<ReturnType<typeof getCelebs>>,
    Awaited<ReturnType<typeof getProfessionCounts>>,
    Awaited<ReturnType<typeof getNationalityCounts>>,
    Awaited<ReturnType<typeof getContentTypeCounts>>,
    Awaited<ReturnType<typeof getGenderCounts>>,
  ];
  try {
    result = await Promise.all([
      getCelebs({
        page: params.page,
        limit: params.pageSize,
        minContentCount: 0,
        sortBy: params.sortBy,
        profession: params.profession,
        nationality: params.nationality,
        contentType: params.contentType,
        gender: params.gender,
        search: params.search,
        tagId: params.tagId,
        tiers: params.tiers,
      }),
      getProfessionCounts(),
      getNationalityCounts(),
      getContentTypeCounts(),
      getGenderCounts(),
    ]);
  } catch (e) {
    console.error("[FiguresPage] 필터 결과 조회 실패:", e);
    return <RetryBlock />;
  }

  // JSX 생성은 try 밖에서 한다 — try 안 JSX는 렌더 오류를 못 잡으면서 린트만 문다
  const [celebsResult, professionCounts, nationalityCounts, contentTypeCounts, genderCounts] = result;
  return (
    <CelebsSection
      initialCelebs={celebsResult.celebs}
      initialTotal={celebsResult.total}
      initialTotalPages={celebsResult.totalPages}
      professionCounts={professionCounts}
      nationalityCounts={nationalityCounts}
      contentTypeCounts={contentTypeCounts}
      genderCounts={genderCounts}
    />
  );
}
