/*
  파일명: actions/game/troy.ts
  기능: 트로이 전쟁 게임 데이터 로드 서버 액션
  책임: 『일리아스』 명단의 인물·관계를 추리고, 판에 서는 인물의 아바타를 data URL 얼굴 메달로 변환해 넘긴다.
*/ // ------------------------------
"use server";

import { celebAvatarSmallUrl } from "@feelandnote/shared/constants/celeb-avatar-small";
import { getMythWorld } from "@/actions/game/myth/getMythWorld";
import { FOE_SLUGS } from "@/components/features/game/myth/troy/campaign/foes";
import { HEROES } from "@/components/features/game/myth/troy/campaign/heroes";
import { buildTroyPool } from "@/components/features/game/myth/troy/pool";
import { portraitDataUrls } from "@/components/features/game/myth/troy/scene/portraitData";
import type { TroyPool } from "@/components/features/game/myth/troy/model";

const ON_BOARD = new Set([...HEROES.map((hero) => hero.slug), ...FOE_SLUGS]);

export interface TroyGameData {
  pool: TroyPool;
  medals: Record<string, string>;
}

export async function getTroyGameData(): Promise<TroyGameData> {
  const pool = buildTroyPool(await getMythWorld());
  const cast = pool.figures.filter((figure) => ON_BOARD.has(figure.slug) && figure.avatarUrl);
  // 작은 판을 먼저 받고, 못 받으면 원래 주소로 한 번 더 받는다
  const small = await portraitDataUrls(cast.map((figure) => celebAvatarSmallUrl(figure.avatarUrl)));
  const missing = cast.filter((figure) => !small.get(celebAvatarSmallUrl(figure.avatarUrl) ?? "")?.startsWith("data:"));
  const full = await portraitDataUrls(missing.map((figure) => figure.avatarUrl));
  const medals = Object.fromEntries(
    cast.flatMap((figure) => {
      const pick = [small.get(celebAvatarSmallUrl(figure.avatarUrl) ?? ""), full.get(figure.avatarUrl ?? "")].find((v) => v?.startsWith("data:"));
      return pick ? [[figure.slug, pick]] : [];
    }),
  );
  return { pool, medals };
}
