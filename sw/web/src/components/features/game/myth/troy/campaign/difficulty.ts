/*
  파일명: components/features/game/myth/troy/campaign/difficulty.ts
  기능: 트로이 전쟁 난이도
  책임: 쉬움·보통·어려움에 따라 장 자료의 적(사건으로 나오는 원군 포함) 능력치를 고친다. 우리 편·아군과 수준(경험치 계산)은 그대로 둔다.
        수치는 게임이 지은 값이다. 보통은 장 자료 그대로다.
*/ // ------------------------------
import type { ChapterBattle, EventAction } from "../engine/battleTypes";
import { statsAt } from "../engine/spawn";
import type { Stats, UnitSpawn } from "../engine/types";
import type { Difficulty } from "../model";

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

// 체력에 곱할 몫과 힘·기술·속도·방어·신력에 더할 값(이동은 건드리지 않는다)
const TUNE: Record<Difficulty, { hp: number; add: number }> = {
  easy: { hp: 0.8, add: -2 },
  normal: { hp: 1, add: 0 },
  hard: { hp: 1.15, add: 1 },
};

function tuneSpawn(spawn: UnitSpawn, difficulty: Difficulty): UnitSpawn {
  if (spawn.side !== "enemy" || difficulty === "normal") return spawn;
  const { hp, add } = TUNE[difficulty];
  const base: Stats = { ...statsAt(spawn.classKey, spawn.level), ...spawn.stats };
  const shift = (v: number) => Math.max(0, v + add);
  const stats: Stats = {
    ...base, hp: Math.max(1, Math.round(base.hp * hp)),
    str: shift(base.str), skl: shift(base.skl), spd: shift(base.spd), def: shift(base.def), res: shift(base.res),
  };
  return { ...spawn, stats };
}

function tuneAction(action: EventAction, difficulty: Difficulty): EventAction {
  return action.do === "spawn" ? { ...action, units: action.units.map((u) => tuneSpawn(u, difficulty)) } : action;
}

export function tuneBattle(battle: ChapterBattle, difficulty: Difficulty = "normal"): ChapterBattle {
  if (difficulty === "normal") return battle;
  return {
    ...battle,
    units: battle.units.map((u) => tuneSpawn(u, difficulty)),
    events: battle.events.map((e) => ({ ...e, actions: e.actions.map((a) => tuneAction(a, difficulty)) })),
  };
}
