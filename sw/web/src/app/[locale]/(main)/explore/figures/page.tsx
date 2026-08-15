/*
  파일명: /app/(main)/explore/figures/page.tsx
  기능: 인물 목록 페이지
  책임: 인물 목록을 필터링하여 보여준다. 통계 줄과 목록을 별도 레인으로 나눠
        하나가 늦어도 나머지는 먼저 뜬다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import type { CelebSortBy } from "@/actions/home";
import { parseCelebTiers } from "@feelandnote/shared/constants/celeb-tiers";
import { FiguresStatsBar, FiguresList, FiguresFilterResult, type FiguresFilterParams } from "./sections";

/* 콜드 상태에서 봇이 받는 완성 HTML이 중간에 잘리지 않게 상한을 넉넉히 둔다 */
export const maxDuration = 30;

/* Lane이 요청 헤더(UA)를 읽어 화면을 동적으로 만든다 — 정적 재검증은 더 이상 의미가 없어 지웠다 */

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

function parseFilterParams(params: Record<string, string | string[] | undefined>): FiguresFilterParams {
  const notAll = (v?: string) => (v && v !== "all" ? v : undefined);
  const sortByRaw = parseParam(params, "sortBy");
  const sortBy = (sortByRaw && VALID_SORT_VALUES.includes(sortByRaw) ? sortByRaw : "daily_recommend") as CelebSortBy;
  const pageRaw = parseInt(parseParam(params, "page") || "1", 10);
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const pageSizeRaw = parseInt(parseParam(params, "pageSize") || "24", 10);
  const pageSize = [12, 24, 48, 96].includes(pageSizeRaw) ? pageSizeRaw : 24;

  return {
    page,
    pageSize,
    sortBy,
    // 등급 필터. 미지정이면 getCelebs가 기본 등급(full·light)만 노출한다.
    tiers: parseCelebTiers(parseParam(params, "tier")),
    profession: notAll(parseParam(params, "profession")),
    nationality: notAll(parseParam(params, "nationality")),
    contentType: notAll(parseParam(params, "contentType")),
    gender: notAll(parseParam(params, "gender")),
    search: parseParam(params, "search") || undefined,
    tagId: notAll(parseParam(params, "tagId")),
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const t = await getTranslations("pending");

  if (isGridView(params)) {
    return (
      <Lane fallback={<PendingBlock variant="grid" count={24} label={t("loading")} />}>
        <FiguresFilterResult params={parseFilterParams(params)} />
      </Lane>
    );
  }

  return (
    <div className="space-y-8 md:space-y-10">
      <Lane fallback={<PendingBlock variant="rows" count={1} label={t("loading")} />}>
        <FiguresStatsBar />
      </Lane>
      <Lane fallback={<PendingBlock variant="grid" cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-6" count={12} />}>
        <FiguresList />
      </Lane>
    </div>
  );
}
