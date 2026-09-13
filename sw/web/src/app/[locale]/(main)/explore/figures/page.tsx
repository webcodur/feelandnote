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
import { isGridView, parseFilterParams } from "./filterParams";
import { FiguresStatsBar, FiguresList, FiguresFilterResult } from "./sections";

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
