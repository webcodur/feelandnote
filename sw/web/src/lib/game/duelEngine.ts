/*
  파일명: lib/game/duelEngine.ts
  기능: 일기토(충전-해방 격투) 게임 엔진
  책임: HP/기세 관리, 행동 매트릭스, AI 의사결정, 라운드 판정을 담당한다.
*/

import type { BattleCard, Command } from "./types";

// ─── 타입 ───

export type DuelAction = "charge" | "strike" | "brace";

export type DuelPhase = "intro" | "select" | "clash" | "resolve" | "end";

export type DuelNarrative =
  | "bothCharge"
  | "enemyMiss"
  | "enemyHit"
  | "playerMiss"
  | "playerHit"
  | "bothMiss"
  | "crossStrike"
  | "perfectGuard"
  | "enemyBraced"
  | "playerBraced"
  | "lull";

export interface DuelClashResult {
  playerAction: DuelAction;
  aiAction: DuelAction;
  playerDamage: number; // 플레이어가 받는 데미지
  aiDamage: number;     // AI가 받는 데미지
  narrative: DuelNarrative;
}
// ─── 상수 ───

export const MAX_MOMENTUM = 5;
export const INITIAL_MOMENTUM = 3;
export const DUEL_TIME_LIMIT_PVP = 5; // 유저간 대전 (초)

// ─── HP 계산 ───

/** 명령에 대응하는 능력치로 HP 결정 */
function getDuelStat(card: BattleCard, command: Command): number {
  switch (command) {
    case "assault": return card.ability.martial;
    case "stratagem": return card.ability.intellect;
    case "govern": return card.ability.command;
  }
}

/** 능력치(0-100) → HP(3-6) */
export function calcDuelHp(card: BattleCard, command: Command): number {
  const stat = getDuelStat(card, command);
  if (stat >= 80) return 6;
  if (stat >= 60) return 5;
  if (stat >= 40) return 4;
  return 3;
}

// ─── 능력치 보정 ───

/**
 * 능력치 차이 → 공방 보정값 (-2 ~ +2)
 * diff 60+ → +2, 30~59 → +1, -29~29 → 0, -59~-30 → -1, -60이하 → -2
 */
export function calcStatMod(myStat: number, theirStat: number): number {
  return Math.max(-2, Math.min(2, Math.floor((myStat - theirStat) / 30)));
}

/** 공격 데미지 = 기세 + 능력치 보정 (최소 0) */
function calcStrikeDmg(momentum: number, attackerStat: number, defenderStat: number): number {
  return Math.max(0, momentum + calcStatMod(attackerStat, defenderStat));
}

/** 방어 시 피해 = floor(데미지/2) - 방어자 보정 (최소 0) */
function calcBraceDmg(rawDamage: number, defenderStat: number, attackerStat: number): number {
  const halved = Math.floor(rawDamage / 2);
  const defBonus = Math.max(0, calcStatMod(defenderStat, attackerStat));
  return Math.max(0, halved - defBonus);
}

// ─── 행동 매트릭스 ───

/**
 * 충전-해방 격투 매트릭스 (능력치 보정 포함):
 *
 * | 나 \ 상대   | 충전              | 공격             | 버티기         |
 * |------------|-------------------|-----------------|---------------|
 * | 충전        | 양쪽 기세+1        | 나 피격(풀+보정)  | 양쪽 기세+1    |
 * | 공격        | 상대 피격(풀+보정)  | 양쪽 피격(+보정)  | 상대 피격(반감) |
 * | 버티기      | 양쪽 기세+1        | 나 피격(반감)     | 아무일 없음    |
 */
export function resolveDuelClash(
  playerAction: DuelAction,
  aiAction: DuelAction,
  playerMomentum: number,
  aiMomentum: number,
  playerStat: number,
  aiStat: number,
): DuelClashResult {
  let playerDamage = 0;
  let aiDamage = 0;
  let narrative: DuelNarrative = "lull";

  if (playerAction === "charge" && aiAction === "charge") {
    narrative = "bothCharge";
  } else if (playerAction === "charge" && aiAction === "strike") {
    playerDamage = calcStrikeDmg(aiMomentum, aiStat, playerStat);
    narrative = aiMomentum === 0 ? "enemyMiss" : "enemyHit";
  } else if (playerAction === "charge" && aiAction === "brace") {
    narrative = "bothCharge";
  } else if (playerAction === "strike" && aiAction === "charge") {
    aiDamage = calcStrikeDmg(playerMomentum, playerStat, aiStat);
    narrative = playerMomentum === 0 ? "playerMiss" : "playerHit";
  } else if (playerAction === "strike" && aiAction === "strike") {
    // 양쪽 공격: 풀데미지 + 능력치 보정
    playerDamage = calcStrikeDmg(aiMomentum, aiStat, playerStat);
    aiDamage = calcStrikeDmg(playerMomentum, playerStat, aiStat);
    const bothEmpty = playerMomentum === 0 && aiMomentum === 0;
    narrative = bothEmpty ? "bothMiss" : "crossStrike";
  } else if (playerAction === "strike" && aiAction === "brace") {
    // 공격 vs 버티기: 능력치 반영 반감
    const raw = calcStrikeDmg(playerMomentum, playerStat, aiStat);
    aiDamage = calcBraceDmg(raw, aiStat, playerStat);
    narrative = playerMomentum === 0 ? "playerMiss" : aiDamage === 0 ? "perfectGuard" : "enemyBraced";
  } else if (playerAction === "brace" && aiAction === "charge") {
    narrative = "bothCharge";
  } else if (playerAction === "brace" && aiAction === "strike") {
    // 버티기 vs 공격: 능력치 반영 반감
    const raw = calcStrikeDmg(aiMomentum, aiStat, playerStat);
    playerDamage = calcBraceDmg(raw, playerStat, aiStat);
    narrative = aiMomentum === 0 ? "enemyMiss" : playerDamage === 0 ? "perfectGuard" : "playerBraced";
  } else {
    // brace vs brace
    narrative = "lull";
  }

  return { playerAction, aiAction, playerDamage, aiDamage, narrative };
}

// ─── 기세 갱신 ───

export function updateMomentum(
  action: DuelAction,
  currentMomentum: number,
): number {
  switch (action) {
    case "charge":
      return Math.min(currentMomentum + 1, MAX_MOMENTUM);
    case "strike":
      return 0; // 공격 시 기세 전부 소모
    case "brace":
      return currentMomentum; // 유지
  }
}

// ─── AI 의사결정 ───

export function duelAiDecide(
  aiMomentum: number,
  playerMomentum: number,
  aiHp: number,
  playerHp: number,
  round: number,
  playerLastAction?: DuelAction,
): DuelAction {
  // 기세 0 → 반드시 충전 (공격해도 0 데미지)
  if (aiMomentum === 0) {
    // 상대 기세 높으면 brace 섞기
    if (playerMomentum >= 3) return Math.random() < 0.5 ? "brace" : "charge";
    return "charge";
  }

  // 기세 최대 → 공격
  if (aiMomentum >= MAX_MOMENTUM) {
    return "strike";
  }

  // 상대 기세 높으면(>=4) 방어적 대응
  if (playerMomentum >= 4) {
    const r = Math.random();
    if (r < 0.50) return "brace";
    if (r < 0.80) return aiMomentum >= 2 ? "strike" : "charge";
    return "charge";
  }

  // 상대가 직전에 strike → 상대 기세 소진 상태, 충전 기회
  if (playerLastAction === "strike") {
    const r = Math.random();
    if (r < 0.45) return "charge";
    if (r < 0.80) return aiMomentum >= 2 ? "strike" : "charge";
    return "brace";
  }

  // HP 위급 + 기세 있음 → 공격적
  if (aiHp <= 2 && aiMomentum >= 2) {
    return Math.random() < 0.70 ? "strike" : "brace";
  }

  // 초반 (1~2합): 상대 기세가 높으면(>=2) brace 비중 높임
  if (round <= 2) {
    if (playerMomentum >= 2) {
      const r = Math.random();
      if (r < 0.45) return "brace";
      if (r < 0.75) return "charge";
      return aiMomentum >= 2 ? "strike" : "charge";
    }
    const r = Math.random();
    if (r < 0.50) return "charge";
    if (r < 0.80) return "brace";
    return aiMomentum >= 2 ? "strike" : "charge";
  }

  // 일반 상황: 균형 잡힌 분포
  const r = Math.random();
  if (r < 0.30) return "charge";
  if (r < 0.65) return aiMomentum >= 2 ? "strike" : "charge";
  return "brace";
}
