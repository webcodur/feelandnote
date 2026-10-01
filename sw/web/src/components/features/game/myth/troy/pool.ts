/*
  파일명: components/features/game/myth/troy/pool.ts
  기능: 트로이 전쟁 판 재료 추리기(서버)
  책임: 신화 게임 공용 데이터에서 『일리아스』 명단의 인물(이름·호칭·아바타·대표 사진)과 그 사이 관계만 골라 화면에 넘긴다.
        전체 데이터는 브라우저로 보내지 않는다. 관계는 인물 slug로 바꿔 둔다(규칙 엔진이 slug로 인연·맞수를 찾는다).
*/ // ------------------------------
import type { MythWorld } from "../shared/types";
import type { TroyPool } from "./model";

export const TROY_MYTH_SLUG = "homer-iliad";

export function buildTroyPool(world: MythWorld): TroyPool {
  const iliad = world.myths.find((myth) => myth.slug === TROY_MYTH_SLUG);
  const members = new Set(iliad?.figureIds ?? []);
  const cast = world.figures.filter((figure) => members.has(figure.id));
  const slugById = new Map(cast.map((figure) => [figure.id, figure.slug]));
  const relations = world.relations.flatMap((relation) => {
    const a = slugById.get(relation.fromId);
    const b = slugById.get(relation.toId);
    return a && b ? [{ a, b, type: relation.type, note: relation.note }] : [];
  });
  return {
    figures: cast.map(({ id, slug, name, title, avatarUrl, portraitUrl }) => ({ id, slug, name, title, avatarUrl, portraitUrl })),
    relations,
    musicUrl: iliad?.musicUrl ?? null,
    isFixture: world.isFixture,
  };
}
