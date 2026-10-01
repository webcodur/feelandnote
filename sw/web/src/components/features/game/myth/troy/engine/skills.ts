/*
  파일명: components/features/game/myth/troy/engine/skills.ts
  기능: 트로이 전쟁 쓰는 기술
  책임: 기술을 지금 쓸 수 있는지, 누구에게 쓸 수 있는지 가리고, 쓰면 상태를 바꿔 연출할 결과를 돌려준다.
        공격형 기술(겨눠 쏘기)은 전투 결판으로 넘긴다.
*/ // ------------------------------
import type { BattleEvent, BattleState } from "./battleTypes";
import { canHit } from "./combatCalc";
import { resolveCombat } from "./combat";
import { gainExp } from "./growth";
import { allied, hasSkill, manhattan, posOf, unitById } from "./grid";
import { BONUS, EXP, SKILLS } from "./tables";
import type { SkillKey, Status, Unit } from "./types";

// #region 쓸 수 있나
export function canUseSkill(state: BattleState, unit: Unit, skill: SkillKey): boolean {
  const info = SKILLS[skill];
  if (info.use === "passive" || !hasSkill(unit, skill)) return false;
  if (info.once && unit.spent.includes(skill)) return false;
  if ((unit.cooldowns[skill] ?? 0) > 0) return false;
  if (info.use === "action" && unit.acted) return false;
  return info.aim === "self" || info.aim === "none" ? true : skillTargets(state, unit.id, skill).length > 0;
}

// 기술을 걸 수 있는 장수 id
export function skillTargets(state: BattleState, unitId: string, skill: SkillKey): string[] {
  const unit = unitById(state, unitId);
  if (!unit) return [];
  const info = SKILLS[skill];
  const at = posOf(unit);
  if (info.aim === "self") return [unit.id];
  if (info.aim === "enemy") return state.units.filter((u) => !allied(u.side, unit.side) && canHit(state, unit, at, u, posOf(u))).map((u) => u.id);
  if (info.aim === "none") return [];
  const [min, max] = info.range;
  const near = state.units.filter((u) => u.id !== unit.id && allied(u.side, unit.side) && manhattan(posOf(u), at) >= min && manhattan(posOf(u), at) <= max);
  const pick: Partial<Record<SkillKey, (u: Unit) => boolean>> = {
    heal: (u) => u.hp < u.stats.hp,
    counsel: (u) => u.acted || u.moved,
  };
  const ok = pick[skill] ?? (() => true);
  return near.filter(ok).map((u) => u.id);
}
// #endregion

// #region 효과
function addStatus(unit: Unit, status: Status): BattleEvent {
  unit.statuses = [...unit.statuses.filter((s) => s.key !== status.key), status];
  return { kind: "status", unitId: unit.id, status };
}

function healAmount(unit: Unit): number {
  return BONUS.healBase + Math.floor(unit.stats.res / 2) + (hasSkill(unit, "physician") ? BONUS.physicianHeal : 0);
}

type Effect = (state: BattleState, unit: Unit, target: Unit | null) => BattleEvent[];

const EFFECTS: Partial<Record<SkillKey, Effect>> = {
  // turns 0 — 이번 편 차례가 끝날 때 거둔다
  wrath: (_s, unit) => [addStatus(unit, { key: "wrath", turns: 0 })],
  athenaBlessing: (_s, unit) => [addStatus(unit, { key: "blessed", turns: 2 }), addStatus(unit, { key: "divineStrike", turns: 2 })],
  shieldWall: (_s, unit) => [addStatus(unit, { key: "guarding", turns: 1 })],
  warCry: (state, unit) =>
    state.units
      .filter((u) => !allied(u.side, unit.side) && manhattan(posOf(u), posOf(unit)) <= SKILLS.warCry.range[1])
      // 상대 편 차례가 열릴 때 1이 줄어드므로 2로 걸어야 그 차례 동안 남는다
      .map((u) => addStatus(u, { key: "shaken", turns: 2 })),
  blessing: (state, unit, target) => (target ? [addStatus(target, { key: "blessed", turns: 1 }), ...gainExp(state, unit, EXP.support)] : []),
  heal: (state, unit, target) => {
    if (!target) return [];
    const amount = Math.min(target.stats.hp - target.hp, healAmount(unit));
    target.hp += amount;
    return [{ kind: "healed", unitId: target.id, amount, hp: target.hp }, ...gainExp(state, unit, EXP.support)];
  },
  cunning: (_s, unit, target) => {
    if (!target) return [];
    const [ux, uy] = [unit.x, unit.y];
    unit.x = target.x;
    unit.y = target.y;
    target.x = ux;
    target.y = uy;
    return [
      { kind: "moved", unitId: unit.id, path: [{ x: target.x, y: target.y }, posOf(unit)] },
      { kind: "moved", unitId: target.id, path: [posOf(unit), posOf(target)] },
    ];
  },
  counsel: (_s, _unit, target) => {
    if (!target) return [];
    target.moved = false;
    target.acted = false;
    target.moveUsed = 0;
    return [{ kind: "status", unitId: target.id, status: { key: "blessed", turns: 0 } }];
  },
  prophecy: (state) => {
    state.flags = state.flags.includes("intents") ? state.flags : [...state.flags, "intents"];
    return [];
  },
};

// 복제한 상태에서 기술을 쓴다. 공격형 기술은 전투로 넘긴다
export function applySkill(state: BattleState, unit: Unit, skill: SkillKey, targetId?: string): BattleEvent[] {
  const info = SKILLS[skill];
  const target = targetId ? unitById(state, targetId) : null;
  if (info.once) unit.spent = [...unit.spent, skill];
  if (info.cooldown > 0) unit.cooldowns = { ...unit.cooldowns, [skill]: info.cooldown };
  if (info.use === "action") {
    unit.acted = true;
    unit.moved = true;
  }
  const head: BattleEvent = { kind: "skill", unitId: unit.id, skill, targetIds: target ? [target.id] : [] };
  if (skill === "aimedShot") return target ? [head, ...resolveCombat(state, unit, target, skill)] : [head];
  return [head, ...(EFFECTS[skill]?.(state, unit, target) ?? [])];
}
// #endregion
