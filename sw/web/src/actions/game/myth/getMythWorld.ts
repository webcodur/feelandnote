/*
  파일명: actions/game/myth/getMythWorld.ts
  기능: 신화 게임 공용 데이터 진입점
  책임: 실제 DB(캐시) → 실패하거나 연결값이 없으면 체험 표본. 표본으로 돌았다는 사실은 isFixture로 화면에 넘긴다.
        화면 서버 부품만 부른다. 게임별 판 재료는 각 게임이 이 결과에서 골라 작게 줄여 내려보낸다.
*/ // ------------------------------
import "server-only";
import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { MYTH_FIXTURE, isMythFixtureMode } from "@/components/features/game/myth/shared/fixture";
import type { MythWorld } from "@/components/features/game/myth/shared/types";
import { fetchMythSourceCatalog, fetchMythSourceRelations } from "./fetchSource";
import { resolveWorld } from "./resolveWorld";

// 두 언어를 한 벌로 담아 언어별로 두 번 캐시하지 않는다. 관계는 따로 캐시해 한 항목이 커지지 않게 한다
const getCachedCatalog = unstable_cache(fetchMythSourceCatalog, ["myth-game-catalog-v1"], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS],
});

const getCachedRelations = unstable_cache(
  async () => fetchMythSourceRelations((await getCachedCatalog()).figures.map((figure) => figure.id)),
  ["myth-game-relations-v1"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS] },
);

function fixtureWorld(locale: string): MythWorld {
  return resolveWorld(MYTH_FIXTURE, MYTH_FIXTURE.relations, locale, true);
}

export async function getMythWorld(): Promise<MythWorld> {
  const locale = await getLocale();
  if (isMythFixtureMode()) return fixtureWorld(locale);
  try {
    const [catalog, relations] = await Promise.all([getCachedCatalog(), getCachedRelations()]);
    return resolveWorld(catalog, relations, locale, false);
  } catch (error) {
    // 조용한 폴백 금지 — 왜 표본으로 돌았는지 서버 기록에 남기고 화면에는 표본 띠를 띄운다
    console.error("[myth-game] 실제 조회 실패 → 체험 표본으로 전환:", error);
    return fixtureWorld(locale);
  }
}
