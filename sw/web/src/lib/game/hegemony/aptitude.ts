/*
  파일명: lib/game/hegemony/aptitude.ts
  기능: 명령 적성 계산
  책임: 인물 데이터(영향력·능력치)에서 명령별 적성을 뽑고 주장·천명 보정을 더한다.
*/

import type { BattleCard, Command } from "../types";
import { COMMANDS } from "../types";
import { RULES } from "./constants";
import type { CaptainEffect, SideState } from "./types";

/**
 * 명령별 기본 적성 (0~20)
 * 전투: (전략+사회)/2 × (1+무력/100) · 책략: (정치+기술)/2 × (1+지력/100) · 내정: (경제+문화)/2 × (1+통솔/100)
 */
const BASE_APTITUDE: Record<Command, (card: BattleCard) => number> = {
  assault: ({ influence: i, ability: a }) => (i.strategic + i.social) / 2 * (1 + a.martial / 100),
  stratagem: ({ influence: i, ability: a }) => (i.political + i.tech) / 2 * (1 + a.intellect / 100),
  govern: ({ influence: i, ability: a }) => (i.economic + i.cultural) / 2 * (1 + a.command / 100),
};

export function baseAptitude(card: BattleCard, command: Command): number {
  return BASE_APTITUDE[command](card);
}

/** 인물이 가장 잘하는 명령 */
export function bestCommandOf(card: BattleCard): Command {
  return COMMANDS.reduce((best, cmd) => (baseAptitude(card, cmd) > baseAptitude(card, best) ? cmd : best), COMMANDS[0]);
}

/** 세 명령 적성의 합 — 선발·회수 우선순위에 쓴다 */
export function totalAptitude(card: BattleCard): number {
  return COMMANDS.reduce((sum, cmd) => sum + baseAptitude(card, cmd), 0);
}

export interface AptitudeBreakdown {
  base: number;
  value: number;
  captain: CaptainEffect;
  mandate: boolean;
}

/** 주장이 손패에 있으면 다른 인물은 "aura", 주장 본인은 "self" */
export function captainEffectOf(card: BattleCard, side: Pick<SideState, "hand" | "captainId">): CaptainEffect {
  const captainInHand = !!side.captainId && side.hand.some((c) => c.id === side.captainId);
  if (!captainInHand) return null;
  return card.id === side.captainId ? "self" : "aura";
}

function boosted(base: number, captain: CaptainEffect, isMandate: boolean): number {
  const captainMul = captain === "self" ? RULES.captainSelf : captain === "aura" ? 1 + RULES.captainAura : 1;
  return base * captainMul * (isMandate ? RULES.mandateBonus : 1);
}

/**
 * 출전 적성. 주장이 손패에 있으면 다른 인물 +15%, 주장 본인이 나서면 ×1.5.
 * 천명과 명령이 맞으면 ×1.5를 곱한다.
 */
export function effectiveAptitude(
  card: BattleCard,
  command: Command,
  side: Pick<SideState, "hand" | "captainId">,
  mandate: Command | null,
): AptitudeBreakdown {
  const base = baseAptitude(card, command);
  const captain = captainEffectOf(card, side);
  const isMandate = mandate === command;
  return { base, value: boosted(base, captain, isMandate), captain, mandate: isMandate };
}

/** 주장 효과를 정해 두고 세 명령 적성을 한꺼번에 낸다. 결산 뒤처럼 손패가 바뀐 때는 기록에 남은 주장 효과를 넘긴다 */
export function aptitudeSet(card: BattleCard, captain: CaptainEffect, mandate: Command | null): Record<Command, number> {
  const out: Record<Command, number> = { assault: 0, stratagem: 0, govern: 0 };
  for (const cmd of COMMANDS) out[cmd] = boosted(baseAptitude(card, cmd), captain, mandate === cmd);
  return out;
}

/** 화면 표시용 적성 (정수) */
export function displayAptitude(value: number): number {
  return Math.round(value);
}
