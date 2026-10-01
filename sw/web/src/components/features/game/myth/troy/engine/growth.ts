/*
  파일명: components/features/game/myth/troy/engine/growth.ts
  기능: 트로이 전쟁 경험치와 수준 오름
  책임: 싸움·치료로 얻는 경험치를 계산해 쌓고, 100이 차면 병과 성장률로 능력치를 올린다(시드 난수).
        우리 편(player)만 경험치를 받는다.
*/ // ------------------------------
import type { BattleEvent, BattleState, LevelUp } from "./battleTypes";
import { roll } from "./rng";
import { CLASSES, EXP, type GrowthKey } from "./tables";
import type { Unit } from "./types";

const GROWTH_KEYS: GrowthKey[] = ["hp", "str", "skl", "spd", "def", "res"];

// 싸움에 나선 값(쓰러뜨렸으면 killed)
export function combatExp(unit: Unit, foe: Unit, killed: boolean): number {
  const diff = foe.level - unit.level;
  if (!killed) return Math.max(1, EXP.hit + Math.max(0, diff));
  const base = Math.min(EXP.killMax, Math.max(EXP.killMin, EXP.killBase + diff * EXP.killDiff));
  return base + (foe.tags.includes("boss") ? EXP.boss : 0);
}

function levelUp(state: BattleState, unit: Unit): LevelUp {
  const growth = CLASSES[unit.classKey].growth;
  const gains: LevelUp["gains"] = {};
  for (const key of GROWTH_KEYS) {
    if (roll(state, growth[key])) gains[key] = 1;
  }
  // 하나도 안 오르면 성장률이 가장 높은 능력치를 올린다
  if (Object.keys(gains).length === 0) {
    const best = [...GROWTH_KEYS].sort((a, b) => growth[b] - growth[a])[0] ?? "hp";
    gains[best] = 1;
  }
  for (const key of GROWTH_KEYS) {
    const add = gains[key] ?? 0;
    unit.stats[key] += add;
    if (key === "hp") unit.hp += add;
  }
  unit.level += 1;
  return { unitId: unit.id, level: unit.level, gains };
}

// 상태를 바꾸고 연출할 결과를 돌려준다(복제한 상태에만 부른다)
export function gainExp(state: BattleState, unit: Unit, amount: number): BattleEvent[] {
  if (unit.side !== "player" || amount <= 0 || unit.level >= EXP.maxLevel) return [];
  const events: BattleEvent[] = [{ kind: "exp", unitId: unit.id, amount }];
  unit.exp += amount;
  state.expGained[unit.id] = (state.expGained[unit.id] ?? 0) + amount;
  while (unit.exp >= EXP.levelAt && unit.level < EXP.maxLevel) {
    unit.exp -= EXP.levelAt;
    events.push({ kind: "levelUp", levelUp: levelUp(state, unit) });
  }
  if (unit.level >= EXP.maxLevel) unit.exp = 0;
  return events;
}
