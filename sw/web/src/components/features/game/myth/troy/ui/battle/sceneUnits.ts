/*
  파일명: components/features/game/myth/troy/ui/battle/sceneUnits.ts
  기능: 판 상태 → 3D 말 목록
  책임: 규칙의 장수(Unit)를 3D 판이 그리는 말(SceneUnit)로 바꾼다. 얼굴 메달은 서버가 만든 data URL을 쓴다.
        우리 편은 성 쪽(위), 적은 바다 쪽(아래)을 보게 둔다.
*/ // ------------------------------
import type { BattleState, Side, Unit } from "../../engine";
import type { SceneUnit } from "../../scene/BoardView";

const FACING: Record<Side, SceneUnit["facing"]> = { player: 2, ally: 2, enemy: 0 };

export function sceneUnit(unit: Unit, name: string, medals: Record<string, string>, hidden = false): SceneUnit {
  return {
    id: unit.id,
    x: unit.x,
    y: unit.y,
    model: unit.model,
    side: unit.side,
    hp: unit.hp,
    maxHp: unit.stats.hp,
    portraitUrl: unit.figureSlug ? medals[unit.figureSlug] ?? null : null,
    initial: [...name][0] ?? "?",
    isHero: Boolean(unit.figureSlug),
    boss: unit.tags.includes("boss"),
    acted: unit.acted && unit.side === "player",
    facing: FACING[unit.side],
    hidden,
  };
}

export function sceneUnits(state: BattleState, nameOf: (unit: Unit) => string, medals: Record<string, string>, hiddenIds: string[] = []): SceneUnit[] {
  return state.units.map((unit) => sceneUnit(unit, nameOf(unit), medals, hiddenIds.includes(unit.id)));
}
