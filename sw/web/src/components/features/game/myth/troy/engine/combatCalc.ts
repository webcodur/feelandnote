/*
  파일명: components/features/game/myth/troy/engine/combatCalc.ts
  기능: 트로이 전쟁 한 번 칠 때의 수치 계산
  책임: 사거리·피해·명중·치명·연속 공격을 지형·높이·인연·맞수·상태·기술 보정까지 넣어 계산하고, 보정 이유(notes)를 남긴다.
        예측(forecast)과 결판(resolve)이 같은 계산을 쓴다.
*/ // ------------------------------
import type { BattleState } from "./battleTypes";
import type { ForecastNote } from "./forecastTypes";
import { hasSkill, hasStatus, manhattan, tileAt } from "./grid";
import { areRivals, auraNear, besideFigure, bondedNear, guardedNear, inTruce } from "./modifiers";
import { BONUS, TERRAIN, WEAPONS } from "./tables";
import type { Point, SkillKey, Unit } from "./types";

export interface StrikeCalc {
  damage: number;
  hit: number;
  crit: number;
  count: number;
  notes: ForecastNote[];
}

type Role = ForecastNote["who"];

function heightOf(state: BattleState, p: Point): number {
  return tileAt(state.map, p)?.height ?? 0;
}

// 이 무기로 at에서 target 칸까지 닿나(사거리 보정 포함)
export function inRange(state: BattleState, unit: Unit, at: Point, target: Point): boolean {
  const w = WEAPONS[unit.weapon];
  if (w.max === 0) return false;
  const lift = heightOf(state, at) - heightOf(state, target);
  const max = w.max + (hasSkill(unit, "longBow") ? 1 : 0) + (w.bow && lift >= 2 ? 1 : 0);
  const d = manhattan(at, target);
  return d >= w.min && d <= max;
}

// 칠 수 있는 몸인가(무기·상태)
export function canStrike(unit: Unit): boolean {
  return WEAPONS[unit.weapon].max > 0 && !hasStatus(unit, "stripped") && !hasStatus(unit, "carrying");
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// who가 foe를 칠 때 한 번의 수치. role은 이 계산이 싸움을 건 쪽(attacker)인지 반격(defender)인지다
export function strikeCalc(state: BattleState, who: Unit, at: Point, foe: Unit, foeAt: Point, role: Role, skill: SkillKey | null): StrikeCalc {
  const other: Role = role === "attacker" ? "defender" : "attacker";
  const notes: ForecastNote[] = [];
  const note = (key: ForecastNote["key"], side: Role, value: string | null = null) => notes.push({ key, who: side, value });
  const w = WEAPONS[who.weapon];
  const foeTile = tileAt(state.map, foeAt);
  const terrain = foeTile ? TERRAIN[foeTile.terrain] : TERRAIN.plain;
  const lift = heightOf(state, at) - heightOf(state, foeAt);
  // #region 위력·공격력
  let might = w.might;
  if (lift >= 1) { might += BONUS.heightMight; note("heightUp", role); }
  if (lift <= -1) note("heightDown", role);
  if (role === "attacker" && who.classKey === "chariot" && who.moveUsed >= BONUS.chargeMove) { might += BONUS.chargeMight; note("charge", role); }
  if (hasSkill(who, "shieldArcher") && besideFigure(state, who, at, "ajax-the-great")) might += BONUS.shieldArcher;
  const filial = hasSkill(who, "filialGuard") && besideFigure(state, who, at, "nestor");
  if (filial) might += BONUS.filialMight;
  if (who.classKey === "rider" && auraNear(state, who, at, "amazonQueen", 2)) might += BONUS.amazonMight;
  const wrath = hasStatus(who, "wrath");
  const attack = (w.magic ? who.stats.res : who.stats.str) + might + (wrath ? BONUS.wrathStr : 0);
  // #endregion
  // #region 막기
  const foeBond = bondedNear(state, foe, foeAt);
  let guard = w.magic ? foe.stats.res : foe.stats.def + terrain.def;
  if (!w.magic && terrain.def > 0) note("terrain", other);
  if (hasStatus(foe, "guarding")) { guard += BONUS.guardingDef; note("guarding", other); }
  if (guardedNear(state, foe, foeAt)) guard += BONUS.guardAuraDef;
  if (auraNear(state, foe, foeAt, "trojanWall", 1)) guard += BONUS.trojanWallDef;
  if (hasSkill(foe, "dawnArmor")) guard += BONUS.dawnDef;
  if (foeBond) { guard += BONUS.bondDef; note("bond", other, foeBond); }
  if (hasStatus(foe, "stripped")) guard = 0;
  let damage = Math.max(0, attack - guard);
  if (auraNear(state, foe, foeAt, "sevenfoldShield", 1)) damage = Math.max(0, damage - BONUS.sevenfold);
  if (hasSkill(foe, "sonOfZeus")) damage = Math.max(0, damage - BONUS.sonOfZeus);
  const shielded = foe.tags.includes("invulnerable") && !hasStatus(who, "divineStrike");
  if (shielded) { damage = 0; note("invulnerable", other); }
  if (foe.tags.includes("invulnerable") && hasStatus(who, "divineStrike")) note("divineStrike", role);
  // #endregion
  // #region 명중·치명
  const myBond = bondedNear(state, who, at);
  let hit = w.hit + who.stats.skl * 2 - (foe.stats.spd * 2 + terrain.avoid);
  if (lift >= 1) hit += BONUS.heightHit;
  if (lift <= -1) hit -= BONUS.heightHit;
  if (myBond) { hit += BONUS.bondHit; note("bond", role, myBond); }
  if (foeBond) hit -= BONUS.bondAvoid;
  if (hasStatus(who, "blessed")) { hit += BONUS.blessedHit; note("blessed", role); }
  if (hasStatus(who, "shaken")) { hit += BONUS.shakenHit; note("shaken", role); }
  if (auraNear(state, who, at, "kingOfMen", 2)) hit += BONUS.kingOfMenHit;
  if (filial) hit += BONUS.filialHit;
  if (hasStatus(foe, "borrowedArmor")) { hit += BONUS.borrowedArmorHit; note("borrowedArmor", other); }
  if (auraNear(state, foe, foeAt, "trojanWall", 1)) hit -= BONUS.trojanWallAvoid;
  const aimed = skill === "aimedShot" && role === "attacker";
  if (aimed) { hit += BONUS.aimedHit; note("skill", role, "aimedShot"); }
  const rival = areRivals(state, who, foe);
  let crit = Math.floor(who.stats.skl / 2) + w.crit - Math.floor(foe.stats.skl / 4);
  if (hasStatus(who, "blessed")) crit += BONUS.blessedCrit;
  if (rival) { crit += BONUS.rivalCrit; note("rival", role, foe.figureSlug); }
  if (hasSkill(who, "apolloGuided")) crit += BONUS.apolloCrit;
  if (aimed) crit += BONUS.aimedCrit;
  if (hasSkill(foe, "dawnArmor")) crit = 0;
  // #endregion
  const count = wrath || who.stats.spd - foe.stats.spd >= BONUS.doubleSpeed ? 2 : 1;
  return { damage, hit: clamp(hit), crit: shielded ? 0 : clamp(crit), count, notes };
}

// who가 at에서 foe(foeAt)를 칠 수 있나 — 반격 여부 판정에도 쓴다
export function canHit(state: BattleState, who: Unit, at: Point, foe: Unit, foeAt: Point): boolean {
  return canStrike(who) && !inTruce(state, who, foe) && inRange(state, who, at, foeAt);
}
