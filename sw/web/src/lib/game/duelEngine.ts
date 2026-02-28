/*
  파일명: lib/game/duelEngine.ts
  기능: 일기토(충전-해방 격투) 게임 엔진
  책임: HP/기세 관리, 행동 매트릭스, AI 의사결정, 라운드 판정을 담당한다.
*/

import type { BattleCard, Command } from "./types";

// ─── 타입 ───

export type DuelAction = "charge" | "strike" | "brace";

export type DuelPhase = "intro" | "select" | "clash" | "resolve" | "end";

export interface DuelFighterState {
  card: BattleCard;
  hp: number;
  maxHp: number;
  momentum: number; // 기세 (0-5)
}

export interface DuelClashResult {
  playerAction: DuelAction;
  aiAction: DuelAction;
  playerDamage: number; // 플레이어가 받는 데미지
  aiDamage: number;     // AI가 받는 데미지
  narrative: string;
}

export interface DuelResult {
  winner: "player" | "ai" | "draw";
  playerHpLeft: number;
  aiHpLeft: number;
  rounds: DuelClashResult[];
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

// ─── 행동 매트릭스 ───

/**
 * 충전-해방 격투 매트릭스:
 *
 * | 나 \ 상대   | 충전        | 공격             | 버티기      |
 * |------------|-------------|-----------------|------------|
 * | 충전        | 양쪽 기세+1  | 나 피격(풀데미지) | 양쪽 기세+1  |
 * | 공격        | 상대 피격    | 양쪽 피격        | 상대 피격(반감)|
 * | 버티기      | 양쪽 기세+1  | 나 피격(반감)    | 아무일 없음   |
 */
export function resolveDuelClash(
  playerAction: DuelAction,
  aiAction: DuelAction,
  playerMomentum: number,
  aiMomentum: number,
  playerAdvantage: boolean, // 능력치 우세 (동시 공격 시 보너스)
): DuelClashResult {
  let playerDamage = 0;
  let aiDamage = 0;
  let narrative = "";

  // 공격 데미지 = max(1, 기세). 기세 0이어도 기본 공격 1
  const pDmg = Math.max(1, playerMomentum);
  const aDmg = Math.max(1, aiMomentum);

  if (playerAction === "charge" && aiAction === "charge") {
    narrative = "양쪽 기세 충전";
  } else if (playerAction === "charge" && aiAction === "strike") {
    playerDamage = aDmg;
    narrative = `적 공격 적중! ${aDmg} 피해`;
  } else if (playerAction === "charge" && aiAction === "brace") {
    narrative = "양쪽 기세 충전";
  } else if (playerAction === "strike" && aiAction === "charge") {
    aiDamage = pDmg;
    narrative = `아군 공격 적중! ${pDmg} 피해`;
  } else if (playerAction === "strike" && aiAction === "strike") {
    // 양쪽 공격: 풀데미지. 우세 측 +1 보너스
    playerDamage = aDmg;
    aiDamage = pDmg;
    if (playerAdvantage) aiDamage += 1;
    narrative = `양쪽 교차 공격!`;
  } else if (playerAction === "strike" && aiAction === "brace") {
    // 공격 vs 버티기: 반감
    aiDamage = Math.max(1, Math.ceil(pDmg / 2));
    narrative = `적이 버텼다! ${aiDamage} 피해 (반감)`;
  } else if (playerAction === "brace" && aiAction === "charge") {
    narrative = "양쪽 기세 충전";
  } else if (playerAction === "brace" && aiAction === "strike") {
    // 버티기 vs 공격: 반감
    playerDamage = Math.max(1, Math.ceil(aDmg / 2));
    narrative = `버텨냈다! ${playerDamage} 피해 (반감)`;
  } else {
    // brace vs brace
    narrative = "소강 상태";
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
): DuelAction {
  // 기세 0이면 충전 우선 (공격은 가능하나 기본 데미지 1)
  if (aiMomentum === 0) {
    if (playerMomentum >= 3) return Math.random() < 0.6 ? "brace" : "charge";
    return Math.random() < 0.8 ? "charge" : "strike";
  }

  // 기세 최대 → 높은 확률로 공격
  if (aiMomentum >= MAX_MOMENTUM) {
    return "strike";
  }

  // 상대 기세 높으면 방어적
  if (playerMomentum >= 4) {
    const r = Math.random();
    if (r < 0.4) return "brace";
    if (r < 0.7) return "strike";
    return "charge";
  }

  // HP 위급 → 공격적
  if (aiHp <= 2 && aiMomentum >= 2) {
    return Math.random() < 0.7 ? "strike" : "charge";
  }

  // 초반 (1~2합) → 충전 경향
  if (round <= 2) {
    const r = Math.random();
    if (r < 0.6) return "charge";
    if (r < 0.85) return "brace";
    return aiMomentum >= 2 ? "strike" : "charge";
  }

  // 일반 상황
  const r = Math.random();
  if (r < 0.35) return "charge";
  if (r < 0.65) return aiMomentum >= 2 ? "strike" : "charge";
  return "brace";
}

// ─── 유틸리티 ───

export const DUEL_ACTION_LABELS: Record<DuelAction, string> = {
  charge: "충전",
  strike: "공격",
  brace: "버티기",
};

export const DUEL_ACTION_ICONS: Record<DuelAction, string> = {
  charge: "⚡",
  strike: "⚔",
  brace: "🛡",
};
