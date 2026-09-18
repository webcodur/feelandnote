/*
  파일명: /app/(main)/explore/ranking/page.tsx
  기능: 분야별 랭킹 전체 보기
  책임: 상단 메뉴에서 선택한 매체의 Top 10 인물과 공통 감상작만 조회해 표시한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getCategoryByDbType } from "@/constants/categories";
import Lane from "@/components/ui/pending/Lane";
import type { RankingNavRow } from "@/components/features/user/explore/figureRankingBoard/FigureRankingBoard";
import FigureRankingBoard from "@/components/features/user/explore/figureRankingBoard/FigureRankingBoard";
import { CONTENT_TYPES, TYPE_COLORS, getRankingHref, resolveRankingType } from "./constants";
import { TopByTypeMedia } from "./sections";

/* 콜드 상태에서 봇이 받는 완성 HTML이 중간에 잘리지 않게 상한을 넉넉히 둔다 */
export const maxDuration = 30;

/* Lane이 요청 헤더(UA)를 읽어 화면을 동적으로 만든다 — 정적 재검증은 더 이상 의미가 없어 지웠다 */

interface PageProps {
  searchParams: Promise<{ category?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const type = resolveRankingType((await searchParams).category);
  const [t, tc] = await Promise.all([
    getTranslations("explore.topByType"),
    getTranslations("content.category"),
  ]);
  return {
    title: `${tc(type.toLowerCase())} · ${t("metaTitle")}`,
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates(getRankingHref(type)),
  };
}

export default async function TopByTypePage({ searchParams }: PageProps) {
  const type = resolveRankingType((await searchParams).category);
  const [t, tc, tr] = await Promise.all([
    getTranslations("pending"),
    getTranslations("content.category"),
    getTranslations("explore.topByType"),
  ]);

  /* 매체 분류 — 칩 모양은 순위판이 정한다. 각 칩은 매체 고유색과 아이콘을 물려받고, 주소 이동(href) 항목이다 */
  const navRows: RankingNavRow[] = [{
    id: "type",
    label: tr("metaTitle"),
    wide: true,
    items: CONTENT_TYPES.map((entry) => {
      const Icon = getCategoryByDbType(entry)?.lucideIcon;
      return {
        id: entry,
        name: tc(entry.toLowerCase()),
        icon: Icon ? <Icon size={13} aria-hidden /> : undefined,
        color: TYPE_COLORS[entry],
        href: getRankingHref(entry),
      };
    }),
    activeId: type,
  }];

  /* 화면 배치는 인물 순위판이 쥔다 — 기다리는 동안에도 같은 순위판이 선택기와 빈 무대를 먼저 세운다 */
  return (
    <Lane
      key={type}
      fallback={<FigureRankingBoard navRows={navRows} accent={TYPE_COLORS[type]} pendingLabel={t("loading")} />}
    >
      <TopByTypeMedia type={type} navRows={navRows} />
    </Lane>
  );
}
