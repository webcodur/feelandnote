/*
  파일명: components/features/game/myth/troy/scene/anims.ts
  기능: 연출 나눠 주기
  책임: SceneAnim의 kind마다 맡은 연출 함수를 객체 맵으로 이어 준다. 연출 본체는 animUnits·animCombat·animWorld에 있다.
*/ // ------------------------------
import type { AnimCtx } from "./animKit";
import { animMelee, animRanged } from "./animCombat";
import { animFall, animHeal, animLevelUp, animMove, animRetreat, animSpawn, animStatus } from "./animUnits";
import { animBurn, animDivine, animShake, animTerrain, animText } from "./animWorld";
import type { AnimOf, SceneAnim } from "./types";

type Handlers = { [K in SceneAnim["kind"]]: (ctx: AnimCtx, a: AnimOf<K>) => Promise<void> };

const HANDLERS: Handlers = {
  move: animMove,
  melee: animMelee,
  ranged: animRanged,
  heal: animHeal,
  fall: animFall,
  retreat: animRetreat,
  spawn: animSpawn,
  levelUp: animLevelUp,
  status: animStatus,
  text: animText,
  terrain: animTerrain,
  burn: animBurn,
  divine: animDivine,
  shake: animShake,
};

export function playAnim(ctx: AnimCtx, anim: SceneAnim): Promise<void> {
  const run = HANDLERS[anim.kind] as (ctx: AnimCtx, a: SceneAnim) => Promise<void>;
  return run(ctx, anim);
}
