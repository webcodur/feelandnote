/*
  파일명: lib/game/deckBuilder.ts
  기능: v5 드래프트 풀 생성 + AI 드래프트 픽
  책임: 175명 단일 풀에서 15장 풀 생성, 교대 드래프트 AI 로직을 담당한다.
*/

import type { BattleCard, Command } from "./types";
import { COMMANDS } from "./types";
import { calcAptitude } from "./gameEngine";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 15장 드래프트 풀 생성
 * 전체 후보에서 14장을 순수 랜덤으로 뽑고, 마지막 1장만 밸런스 보정한다.
 */
export function buildDraftPool(allCards: BattleCard[]): BattleCard[] {
  const count = 15;
  if (allCards.length <= count) return shuffle(allCards);

  const shuffled = shuffle([...allCards]);

  // 14장 순수 랜덤
  const pool = shuffled.slice(0, count - 1);
  const remaining = shuffled.slice(count - 1);

  // 마지막 1장: 가장 약한 명령을 보강
  const cmdMax: Record<Command, number> = {
    assault: 0, stratagem: 0, govern: 0,
  };
  for (const card of pool) {
    for (const cmd of COMMANDS) {
      cmdMax[cmd] = Math.max(cmdMax[cmd], calcAptitude(card, cmd));
    }
  }
  const weakestCmd = COMMANDS.reduce((a, b) => cmdMax[a] < cmdMax[b] ? a : b);
  remaining.sort((a, b) => calcAptitude(b, weakestCmd) - calcAptitude(a, weakestCmd));
  const topN = Math.min(5, remaining.length);
  pool.push(remaining[Math.floor(Math.random() * topN)]);

  return shuffle(pool);
}

// ─── 드래프트 AI 픽 ───

/** 카드의 종합 적성 합산 (티어 대체) */
function totalAptitude(card: BattleCard): number {
  let sum = 0;
  for (const cmd of COMMANDS) sum += calcAptitude(card, cmd);
  return sum;
}

/**
 * AI가 드래프트에서 1장을 선택한다.
 * 현재 내 픽에서 약한 명령을 보강하는 카드를 우선 선택한다.
 */
export function aiDraftPick(
  availableCards: BattleCard[],
  aiPicks: BattleCard[],
  playerPicks: BattleCard[],
): BattleCard {
  if (availableCards.length === 1) return availableCards[0];

  // AI 픽이 없으면 종합 적성 최고 카드 선택
  if (aiPicks.length === 0) {
    let best = availableCards[0];
    let bestScore = -Infinity;
    for (const card of availableCards) {
      const score = totalAptitude(card) + Math.random() * 3;
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }
    return best;
  }

  // AI 기존 픽에서 명령별 최고 적성 계산
  const cmdMax: Record<Command, number> = {
    assault: 0, stratagem: 0, govern: 0,
  };
  for (const card of aiPicks) {
    for (const cmd of COMMANDS) {
      cmdMax[cmd] = Math.max(cmdMax[cmd], calcAptitude(card, cmd));
    }
  }

  // 가장 약한 명령 찾기
  const weakestCmd = COMMANDS.reduce((a, b) => cmdMax[a] < cmdMax[b] ? a : b);

  // 그 명령 적성이 높은 카드를 우선 선택 (약간의 랜덤성)
  let best = availableCards[0];
  let bestScore = -Infinity;
  for (const card of availableCards) {
    const weakScore = calcAptitude(card, weakestCmd) * 2;
    let score = weakScore + totalAptitude(card) + Math.random() * 3;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }

  return best;
}
