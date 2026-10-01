/*
  파일명: components/features/game/myth/shared/fixture.ts
  기능: 신화 게임 체험 표본
  책임: DB 연결값이 없는 로컬에서 게임이 돌아가게 한다. 값은 지어내지 않고 실제 DB에서 뽑은 것이다.
        다시 뽑기: sw/web에서 `node --env-file=<DB 키가 든 .env> scripts/build-myth-game-fixture.mjs`
        서버 조회만 이 파일을 불러야 한다 — 화면 부품이 부르면 표본 전체가 브라우저로 실린다.
*/ // ------------------------------
import raw from "./fixture.json";
import type { MythSourceCatalog, MythSourceRelation } from "./types";

interface MythFixtureFile extends MythSourceCatalog {
  source: string;
  generatedAt: string;
  relations: MythSourceRelation[];
}

export const MYTH_FIXTURE = raw as unknown as MythFixtureFile;

export function isMythFixtureMode(): boolean {
  return !process.env.NEXT_PUBLIC_DB_API_URL || !process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY;
}
