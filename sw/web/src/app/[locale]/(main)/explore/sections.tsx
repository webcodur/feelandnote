/*
  파일명: /app/(main)/explore/sections.tsx
  기능: 탐색 허브 구획 본문 — 구획마다 자기 조회만 한다
  책임: 한 구획이 다른 구획을 기다리지 않게 조회를 구획 단위로 쪼개고,
        실패는 여기서 잡아 제자리에 "다시 시도"를 세운다.
        Lane 안에서 그려지므로 여기서 던지면 안 된다 — 완성 HTML 모드에서 화면 전체가 죽는다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";

import { getCelebs } from "@/actions/home/getCelebs";
import { getTopByContentType } from "@/actions/home/getTopByContentType";
import { getSpectrumDistribution } from "@/actions/spectrum/getSpectrumDistribution";
import { getFactionHubPreviews } from "@/actions/home/getFactionHubPreviews";
import { getRelationShapes } from "@/actions/home/getRelationShapes";
import { getRelationNeighborhood } from "@/actions/home/getRelationNeighborhood";
import { RetryBlock } from "@/components/ui/pending";
import RankingTabs from "@/components/features/user/explore/hub/RankingTabs";
import SpectrumDistribution from "@/components/features/user/explore/spectrumAnalysis/SpectrumDistribution";
import FactionCard from "@/components/features/user/explore/hub/FactionCard";
import RelationMap from "@/components/features/celeb/RelationMap/RelationMap";

const HUB_SPECTRUM_MIN_INFLUENCE = 40;

/** 자료가 정말 0건인 구획 — 자리는 남기고 한 줄만 둔다 */
async function EmptyLine() {
  const t = await getTranslations("pending");
  return <p className="text-sm text-text-secondary text-center py-8">{t("empty")}</p>;
}

/** 실패를 null로 바꿔 넘긴다 — 빈 배열(정말 0건)과 구분해야 탭이 사라지지 않는다 */
function settled<T>(label: string, result: PromiseSettledResult<T>): T | null {
  if (result.status === "fulfilled") return result.value;
  console.error(`[ExplorePage] ${label} 조회 실패:`, result.reason);
  return null;
}

/** 조회 하나를 실패해도 던지지 않게 감싼다. try/catch 대신 allSettled를 쓴다 —
 *  JSX를 try 안에서 만들면 React가 나중에 그리므로 어차피 잡히지 않는다 */
async function load<T>(label: string, run: () => Promise<T>): Promise<T | null> {
  const [result] = await Promise.allSettled([run()]);
  return settled(label, result);
}

/* 프로필 — 인기 · 기록왕 · 랜덤. 셋을 한 레인에 묶되 하나가 실패해도 나머지는 그대로 뜬다.
   인기는 영향력(고정값)과 달리 최근 30일 조회로 매겨 순위가 흐른다 */
export async function ProfileSection() {
  const [trending, topByType, dailyPicks] = await Promise.allSettled([
    getCelebs({ sortBy: "trending", limit: 12 }).then((r) => r.celebs),
    getTopByContentType(),
    getCelebs({ sortBy: "daily_recommend", limit: 12, tiers: ["full"] }).then((r) => r.celebs),
  ]);

  return (
    <RankingTabs
      trending={settled("인기 인물", trending)}
      topByType={settled("분야별 기록왕", topByType)}
      dailyPicks={settled("랜덤 인물", dailyPicks)}
    />
  );
}

/* 성향 분포 */
export async function SpectrumSection() {
  const people = await load("성향 분포", () =>
    getSpectrumDistribution({ minInfluence: HUB_SPECTRUM_MIN_INFLUENCE }),
  );

  if (people === null) return <RetryBlock />;
  if (people.length === 0) return <EmptyLine />;
  return <SpectrumDistribution people={people} />;
}

/* 관계망 — 탐색기와 사슬. 관계 자료는 인물 상세의 도표 모달에만 있어
   크롤러에게 막다른 길이었다. 여기서 인물 상세로 가는 실제 링크로 편다.
   조회순 인물 목록이 이 자리에 있던 때는 위 「인기」 탭과 같은 집합이라 겹쳤다.
   탐색기의 첫 판은 여기서 서버가 받아 넘긴다 — 크롤러도 관계와 링크를 그대로 받는다.
   실패하면 조용히 접는다 — 목차에 없는 보조 구획이라 자리를 비워도 화면이 성립한다 */
export async function RelationMapSection() {
  const t = await getTranslations("explore.hub.relationMap");
  const shapes = await load("관계망", getRelationShapes);
  if (!shapes) return null;

  const opening = shapes.openingCelebId
    ? await load("관계망 첫 판", () => getRelationNeighborhood(shapes.openingCelebId!))
    : null;

  return (
    <RelationMap
      headingId="explore-relation-map"
      title={t("title")}
      description={t("description")}
      shapes={shapes}
      opening={opening}
    />
  );
}

/* 세력도감 */
export async function FactionSection() {
  const locale = await getLocale();
  const tags = await load("세력도감", getFactionHubPreviews);

  if (tags === null) return <RetryBlock />;
  if (tags.length === 0) return <EmptyLine />;
  return <FactionCard locale={locale} tags={tags} />;
}
