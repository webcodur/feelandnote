/*
  파일명: lib/game/hegemony/constants.ts
  기능: 패권 규칙 수치 단일원천
  책임: 엔진·AI·화면·규칙 안내가 같은 값을 읽도록 조정값을 한 곳에 둔다. 문서는 값을 복제하지 않는다.
*/

import type { Command } from "../types";

export const RULES = {
  // 국가
  initialPower: 30,
  maxPower: 35,
  // 민심을 40으로 낮춰 책략이 반란까지 몰아붙일 수 있게 했다 (v6은 50·상한 60 — AI 대전 시뮬레이션에서 반란이 드물었다)
  initialMorale: 40,
  maxMorale: 50,
  // 판 길이 — 이 라운드가 끝나면 국력이 높은 쪽이 이긴다
  maxRounds: 12,
  handSize: 5,
  // 명령 효과: 전투·책략 피해 = 적성/2, 내정 국력 회복 = 적성/3, 민심 회복 = 적성/2
  assaultMoraleCost: 3,
  offenseDivisor: 2,
  governPowerDivisor: 3,
  governMoraleDivisor: 2,
  // 상성 배수
  counterWin: 1.5,
  mirrorWin: 1,
  mirrorTie: 0.5,
  // 보정
  mandateBonus: 1.5,
  captainAura: 0.15,
  captainSelf: 1.5,
  // 격화 — 이 라운드부터 공격 피해가 라운드마다 늘어난다 (회복은 늘지 않는다)
  escalationStartRound: 5,
  escalationPerRound: 0.18,
  // 반란 — 민심 0이면 매 라운드 국력 -(기본값 + 라운드)
  rebellionBase: 3,
  // 민심이 이 값 이하면 화면이 위험을 알린다
  moraleDanger: 12,
  // 손패가 비면 쉬던 인물 가운데 이 수만큼 후보를 보여 주고 하나를 불러온다
  recallChoices: 2,
  // 같은 명령 접전에서 한 판에 신청할 수 있는 일기토 횟수
  duelsPerGame: 1,
  // 인재 선발 — 3명씩 5묶음, 묶음마다 둘이 한 명씩 뽑고 남은 한 명은 제외
  draftBatches: 5,
  draftBatchSize: 3,
} as const;

export const DRAFT_POOL_SIZE = RULES.draftBatches * RULES.draftBatchSize;

/** 상성: 키가 값을 이긴다 (전투 > 내정 > 책략 > 전투) */
export const BEATS: Record<Command, Command> = {
  assault: "govern",
  govern: "stratagem",
  stratagem: "assault",
};

/** 키를 이기는 명령 */
export const BEATEN_BY: Record<Command, Command> = {
  assault: "stratagem",
  govern: "assault",
  stratagem: "govern",
};

export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

/** 난이도별 정보 공개·선발 순서·AI 성향 */
export const DIFFICULTY_PROFILE: Record<Difficulty, {
  /** 상대 카드의 적성을 보여 주는가 */
  revealEnemy: boolean;
  /** 인재 선발 첫 묶음에서 AI가 먼저 뽑는가 */
  aiFirst: boolean;
  /** AI 선택의 무작위성 (값이 클수록 들쭉날쭉) */
  temperature: number;
  /** 플레이어 최근 명령 습관을 읽는 비중 */
  habitWeight: number;
  /** 아예 무작위로 두는 확률 */
  blunder: number;
}> = {
  easy: { revealEnemy: true, aiFirst: false, temperature: 5, habitWeight: 0, blunder: 0.35 },
  normal: { revealEnemy: true, aiFirst: false, temperature: 1.2, habitWeight: 0.25, blunder: 0 },
  hard: { revealEnemy: false, aiFirst: true, temperature: 1.6, habitWeight: 0.3, blunder: 0 },
};

/** 라운드의 공격 격화 배수. 회복에는 적용하지 않는다 */
export function escalationOf(round: number): number {
  const steps = Math.max(0, round - RULES.escalationStartRound + 1);
  return 1 + steps * RULES.escalationPerRound;
}

/** 민심 0 반란 피해 */
export function rebellionDamageOf(round: number): number {
  return RULES.rebellionBase + round;
}
