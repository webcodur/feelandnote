/*
  파일명: /app/(main)/explore/spectrum/page.tsx
  기능: 비범한 기록가 전체 보기 페이지
  책임: spectrum 16축 극단 셀럽 + 9명 차순위(Top 10)를 표시한다. 본문은 레인 하나로 스트리밍한다.
        화면 배치는 인물 순위판이 쥔다 — 기다리는 동안에도 같은 순위판이 선택기와 빈 무대를 먼저 세운다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import Lane from "@/components/ui/pending/Lane";
import FigureRankingBoard from "@/components/features/user/explore/figureRankingBoard/FigureRankingBoard";
import { buildSpectrumNavRows } from "@/components/features/user/explore/sections/SpectrumFullSection/navRows";
import { GROUPS, AXIS_COLORS } from "@/components/features/user/explore/spectrumAxis";
import { SpectrumBody } from "./sections";

/* Lane이 요청 헤더(UA)를 읽어 화면을 동적으로 만든다 — 정적 재검증은 더 이상 의미가 없어 지웠다 */

export async function generateMetadata() {
  const t = await getTranslations("explore.spectrum");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/spectrum"),
  };
}

export default async function SpectrumPage() {
  const [locale, t, ts] = await Promise.all([
    getLocale(),
    getTranslations("pending"),
    getTranslations("explore.spectrum"),
  ]);

  /* 본문이 처음 펴는 범주·축(첫 범주의 첫 축)과 같은 선택기를 자료 없이 먼저 세운다 */
  const firstAxis = GROUPS[0].keys[0];
  const navRows = buildSpectrumNavRows({
    isEn: locale === "en",
    labels: { group: ts("groupNav"), axis: ts("axisNav") },
    activeTab: 0,
    activeAxis: firstAxis,
  });
  const pending = <FigureRankingBoard navRows={navRows} accent={AXIS_COLORS[firstAxis]} pendingLabel={t("loading")} />;

  return (
    <Lane fallback={pending}>
      <SpectrumBody navRows={navRows} accent={AXIS_COLORS[firstAxis]} />
    </Lane>
  );
}
