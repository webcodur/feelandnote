/*
  파일명: components/features/game/myth/troy/engine/combat.ts
  기능: 트로이 전쟁 전투 예측과 결판
  책임: 공격 전에 양쪽 수치를 예측하고(forecast), 실제로 칠 때는 시드 난수로 명중·치명을 굴려 체력을 깎는다.
        쓰러짐·물러남(여신의 비호·retreatBelow)·맞수 첫 만남·경험치까지 한 번에 처리해 연출할 결과를 돌려준다.
*/ // ------------------------------
import type { BattleEvent, BattleState, Strike } from "./battleTypes";
import { canHit, strikeCalc, type StrikeCalc } from "./combatCalc";
import type { Forecast, ForecastSide } from "./forecastTypes";
import { gainExp, combatExp } from "./growth";
import { hasSkill, posOf, unitById } from "./grid";
import { areRivals, pairKey } from "./modifiers";
import { roll } from "./rng";
import { WEAPONS } from "./tables";
import type { Point, SkillKey, Unit } from "./types";

// #region 예측
function sideOf(unit: Unit, foe: Unit, calc: StrikeCalc | null): ForecastSide {
  const strikes = calc ? calc.count : 0;
  const damage = calc?.damage ?? 0;
  return {
    unitId: unit.id, hp: unit.hp, maxHp: unit.stats.hp, damage,
    hit: calc?.hit ?? 0, crit: calc?.crit ?? 0, strikes,
    foeHpIfAllHit: Math.max(0, foe.hp - damage * strikes),
  };
}

// attacker가 from(없으면 지금 칸)에서 defender를 칠 때
export function forecast(state: BattleState, attackerId: string, defenderId: string, from?: Point, skill: SkillKey | null = null): Forecast | null {
  const a = unitById(state, attackerId);
  const d = unitById(state, defenderId);
  if (!a || !d) return null;
  const at = from ?? posOf(a);
  const dAt = posOf(d);
  if (!canHit(state, a, at, d, dAt)) return null;
  const mine = strikeCalc(state, a, at, d, dAt, "attacker", skill);
  const counters = canHit(state, d, dAt, a, at) && !d.tags.includes("noCounter");
  const theirs = counters ? strikeCalc(state, d, dAt, a, at, "defender", null) : null;
  return {
    attacker: sideOf(a, d, mine),
    defender: sideOf(d, a, theirs),
    ranged: WEAPONS[a.weapon].min >= 2 || Math.abs(at.x - dAt.x) + Math.abs(at.y - dAt.y) >= 2,
    skill,
    notes: [...mine.notes, ...(theirs?.notes ?? [])],
  };
}
// #endregion

// #region 판에서 빼기
export function removeUnit(state: BattleState, unit: Unit, how: "fell" | "retreated"): BattleEvent {
  state.units = state.units.filter((u) => u.id !== unit.id);
  state.removed = [...state.removed.filter((u) => u.id !== unit.id), unit];
  if (how === "fell") state.fallen = [...state.fallen, unit.id];
  else state.retreated = [...state.retreated, unit.id];
  return how === "fell" ? { kind: "fell", unitId: unit.id } : { kind: "retreated", unitId: unit.id };
}

// 체력이 0이 된 장수. 여신의 비호는 한 번 체력 1로 남아 물러난다
function knockOut(state: BattleState, unit: Unit): BattleEvent {
  const rescued = hasSkill(unit, "goddessRescue") && !unit.spent.includes("goddessRescue");
  if (!rescued) return removeUnit(state, unit, "fell");
  unit.hp = 1;
  unit.spent = [...unit.spent, "goddessRescue"];
  return removeUnit(state, unit, "retreated");
}

// 싸움 뒤 체력이 기준 아래면 물러난다(헥토르 1장 등)
function maybeRetreat(state: BattleState, unit: Unit): BattleEvent | null {
  if (unit.retreatBelow === null || unit.hp <= 0) return null;
  if (!state.units.some((u) => u.id === unit.id)) return null;
  return unit.hp / unit.stats.hp < unit.retreatBelow ? removeUnit(state, unit, "retreated") : null;
}
// #endregion

// #region 결판
function strikeOnce(state: BattleState, who: Unit, foe: Unit, calc: StrikeCalc): Strike {
  const hit = roll(state, calc.hit);
  const crit = hit && roll(state, calc.crit);
  const damage = hit ? calc.damage * (crit ? 2 : 1) : 0;
  foe.hp = Math.max(0, foe.hp - damage);
  return { attackerId: who.id, targetId: foe.id, hit, crit, damage, targetHp: foe.hp };
}

// 복제한 상태에서 a가 d를 친다. 이동은 이미 끝났다고 본다
export function resolveCombat(state: BattleState, a: Unit, d: Unit, skill: SkillKey | null): BattleEvent[] {
  const events: BattleEvent[] = [];
  const rival = areRivals(state, a, d);
  const key = pairKey(a.figureSlug ?? a.id, d.figureSlug ?? d.id);
  if (rival && !state.clashed.includes(key)) {
    state.clashed = [...state.clashed, key];
    events.push({ kind: "rivalClash", a: a.id, b: d.id, note: rival.note });
  }
  const at = posOf(a);
  const dAt = posOf(d);
  const mine = strikeCalc(state, a, at, d, dAt, "attacker", skill);
  const counters = canHit(state, d, dAt, a, at) && !d.tags.includes("noCounter");
  const theirs = counters ? strikeCalc(state, d, dAt, a, at, "defender", null) : null;
  const order: [Unit, Unit, StrikeCalc][] = [[a, d, mine]];
  if (theirs) order.push([d, a, theirs]);
  if (mine.count > 1) order.push([a, d, mine]);
  if (theirs && theirs.count > 1) order.push([d, a, theirs]);
  const strikes: Strike[] = [];
  for (const [who, foe, calc] of order) {
    if (who.hp <= 0 || foe.hp <= 0) break;
    strikes.push(strikeOnce(state, who, foe, calc));
  }
  events.push({ kind: "combat", attackerId: a.id, defenderId: d.id, ranged: WEAPONS[a.weapon].min >= 2 || Math.abs(at.x - dAt.x) + Math.abs(at.y - dAt.y) >= 2, strikes });
  const aDown = a.hp <= 0;
  const dDown = d.hp <= 0;
  if (dDown) events.push(knockOut(state, d));
  if (aDown) events.push(knockOut(state, a));
  for (const unit of [a, d]) {
    const back = maybeRetreat(state, unit);
    if (back) events.push(back);
  }
  if (a.hp > 0) events.push(...gainExp(state, a, combatExp(a, d, dDown)));
  if (d.hp > 0) events.push(...gainExp(state, d, combatExp(d, a, aDown)));
  return events;
}
// #endregion
