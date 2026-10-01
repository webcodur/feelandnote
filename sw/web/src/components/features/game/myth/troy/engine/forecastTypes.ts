/*
  파일명: components/features/game/myth/troy/engine/forecastTypes.ts
  기능: 트로이 전쟁 전투 예측 자료형
  책임: 공격을 고르기 전에 화면이 보여 줄 양쪽 수치와 보정 이유의 모양을 정한다. 규칙(combat.ts)이 채우고 화면이 읽는다.
*/ // ------------------------------
import type { SkillKey } from "./types";

export interface ForecastSide {
  unitId: string;
  // 싸움 전 체력
  hp: number;
  maxHp: number;
  // 한 번 칠 때 피해(치명이 아닐 때)
  damage: number;
  hit: number;
  crit: number;
  // 칠 횟수. 0이면 치지 못한다(사거리 밖·지팡이·치지 않는 사이)
  strikes: number;
  // 모두 맞았을 때 상대에게 남는 체력(0이면 쓰러뜨릴 수 있다)
  foeHpIfAllHit: number;
}

export type ForecastNoteKey =
  | "bond" | "rival" | "heightUp" | "heightDown" | "terrain" | "blessed" | "shaken" | "guarding"
  | "invulnerable" | "divineStrike" | "charge" | "skill" | "borrowedArmor";

// 보정 하나. who는 보정을 받는 쪽, value는 인물 slug(인연·맞수)나 기술 키(skill)
export interface ForecastNote {
  key: ForecastNoteKey;
  who: "attacker" | "defender";
  value: string | null;
}

export interface Forecast {
  attacker: ForecastSide;
  defender: ForecastSide;
  ranged: boolean;
  // 이번 공격에 쓰는 기술(겨눠 쏘기 등). 보통 공격이면 null
  skill: SkillKey | null;
  notes: ForecastNote[];
}
