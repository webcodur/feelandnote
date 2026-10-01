/*
  파일명: lib/game/hegemony/types.ts
  기능: 패권 규칙 상태 타입
  책임: 엔진·AI·화면 상태가 공유하는 국가·진영·출전·라운드 기록 타입을 정의한다.
*/

import type { BattleCard, Command } from "../types";

export type Side = "player" | "ai";

/** 플레이어 관점 상성 판정 */
export type Verdict = "win" | "lose" | "draw";

/** 같은 명령끼리 붙었을 때 무엇으로 갈렸는가 */
export type MirrorResolution = "aptitude" | "tie" | "duel";

export type DuelWinner = Side | "draw";

export interface Nation {
  power: number;
  morale: number;
}

/** 한 진영의 판 위 상태 */
export interface SideState {
  hand: BattleCard[];
  /** 전투·책략에 써서 쉬고 있는 인물 */
  used: BattleCard[];
  nation: Nation;
  captainId: string | null;
  duelsLeft: number;
}

/** 한 라운드의 출전 결정 */
export interface Play {
  cardId: string;
  command: Command;
  /** 내정일 때 불러올 쉬던 인물. 비우면 가장 강한 인물을 불러온다 */
  recoverId?: string;
}

export type CaptainEffect = "self" | "aura" | null;

/** 한 진영의 명령이 낳은 결과 */
export interface SideOutcome {
  cardId: string;
  command: Command;
  /** 주장·천명 보정까지 반영한 적성 */
  aptitude: number;
  captain: CaptainEffect;
  mandate: boolean;
  /** 상성 배수 (0 · 0.5 · 1 · 1.5) */
  multiplier: number;
  /** 상대에게 준 피해 (양수) */
  dealtPower: number;
  dealtMorale: number;
  /** 내가 되찾은 양 (양수) */
  healedPower: number;
  healedMorale: number;
  /** 전투로 치른 민심 */
  moraleCost: number;
  consumed: boolean;
  recoveredId: string | null;
}

/** 한 진영 국가의 라운드 변화 합계 */
export interface NationChange {
  power: number;
  morale: number;
  /** 민심이 0 아래로 넘친 만큼 국력으로 옮겨 간 피해 */
  overflow: number;
  /** 반란 피해 (0이면 반란 없음) */
  rebellion: number;
}

export interface RoundRecord {
  round: number;
  mandate: Command | null;
  escalation: number;
  verdict: Verdict;
  mirror: MirrorResolution | null;
  duelWinner: DuelWinner | null;
  player: SideOutcome;
  ai: SideOutcome;
  change: Record<Side, NationChange>;
  after: Record<Side, Nation>;
}

export type GameWinner = Side | "draw";

export type Rng = () => number;
