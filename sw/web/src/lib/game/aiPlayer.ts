/*
  파일명: lib/game/aiPlayer.ts
  기능: AI 플레이어 로직
  책임: 혼합 전략 기반 카드 선택을 제공한다.
*/

import type { BattleCard, Domain } from "./types";

export type AiDifficulty = "easy" | "normal";

export type AiStrategy = "dominate" | "prepare";

export const AI_STRATEGY_LABELS: Record<AiStrategy, string> = {
  dominate: "공세 — 상대방이 이 영역을 반드시 따내겠다고 판단하고 가장 유리한 카드를 출전시켰습니다.",
  prepare: "포석 — 상대방이 다음 영역이 더 중요하다고 판단하고 핵심 카드를 아껴두었습니다.",
};

type Strategy = AiStrategy;

/** 가중 랜덤 선택 */
function weightedRandom(weights: Record<Strategy, number>): Strategy {
  const entries = Object.entries(weights) as [Strategy, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;
  for (const [strategy, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return strategy;
  }
  return entries[0][0];
}

/** 상대 패에서 해당 영역 최강 점수 추정 (공개 정보) */
function estimateOpponentBest(opponentHand: BattleCard[], domain: Domain): number {
  if (opponentHand.length === 0) return 0;
  return Math.max(...opponentHand.map((c) => c.influence[domain]));
}

/** 전략별 가중치 산출 (상황 적응형) */
function computeWeights(
  scoreDiff: number, // AI 점수 - 플레이어 점수
  remainingRounds: number,
): Record<Strategy, number> {
  const weights: Record<Strategy, number> = {
    dominate: 50,
    prepare: 50,
  };

  if (scoreDiff < 0) {
    // AI가 뒤지고 있으면 → 압도 비중 상승
    weights.dominate += Math.abs(scoreDiff) * 15;
    weights.prepare -= Math.abs(scoreDiff) * 10;
  } else if (scoreDiff > 0) {
    // AI가 앞서면 → 포석 비중 상승
    weights.prepare += scoreDiff * 12;
    weights.dominate -= scoreDiff * 8;
  }

  // 마지막 라운드엔 포석 무의미 → 압도
  if (remainingRounds <= 1) {
    weights.prepare = 0;
    weights.dominate = 100;
  }

  // 2라운드 남았을 때 포석 약간 감소
  if (remainingRounds === 2) {
    weights.prepare = Math.floor(weights.prepare * 0.6);
  }

  // 최소 0 보정
  for (const k of Object.keys(weights) as Strategy[]) {
    if (weights[k] < 0) weights[k] = 0;
  }

  return weights;
}

/** 압도: 이길 수 있으면 최소 투자로, 못 이기면 최강 투입 */
function dominatePick(hand: BattleCard[], domain: Domain, opponentBest: number): BattleCard {
  // 이길 수 있는 카드 중 가장 약한 것
  const winners = hand
    .filter((c) => c.influence[domain] > opponentBest)
    .sort((a, b) => a.influence[domain] - b.influence[domain]);
  if (winners.length > 0) return winners[0];

  // 이길 수 없으면 해당 영역 최강 카드
  return hand.reduce((best, card) =>
    card.influence[domain] > best.influence[domain] ? card : best
  );
}

/** 포석: 미래 영역에서의 가치가 낮은 카드를 현재 소모 */
function preparePick(hand: BattleCard[], currentDomain: Domain, futureDomains: Domain[]): BattleCard {
  if (futureDomains.length === 0) return dominatePick(hand, currentDomain, Infinity);

  // 각 카드의 "미래 가치" = 남은 영역들에서의 최고 점수
  const scored = hand.map((card) => {
    const futureMax = Math.max(...futureDomains.map((d) => card.influence[d]));
    return { card, futureMax };
  });

  // 미래 가치가 낮은 카드를 우선 소모
  scored.sort((a, b) => a.futureMax - b.futureMax);
  return scored[0].card;
}

export interface AiBattleResult {
  card: BattleCard;
  strategy: AiStrategy;
}

/** 혼합 전략 AI 배틀 픽 */
function smartPick(
  hand: BattleCard[],
  currentDomain: Domain,
  playerHand: BattleCard[],
  aiScore: number,
  playerScore: number,
  remainingRounds: number,
  futureDomains: Domain[],
): AiBattleResult {
  if (hand.length <= 1) return { card: hand[0], strategy: "dominate" };

  const scoreDiff = aiScore - playerScore;
  const opponentBest = estimateOpponentBest(playerHand, currentDomain);
  const weights = computeWeights(scoreDiff, remainingRounds);
  let strategy = weightedRandom(weights);

  let card: BattleCard;
  switch (strategy) {
    case "dominate":
      card = dominatePick(hand, currentDomain, opponentBest);
      break;
    case "prepare":
      card = preparePick(hand, currentDomain, futureDomains);
      break;
  }

  return { card, strategy };
}

/** AI 드래프트 픽 */
export function aiDraftPick(
  pool: BattleCard[],
  _difficulty: AiDifficulty = "normal"
): BattleCard {
  // 총합이 가장 높은 카드를 선택 (단순하지만 효과적)
  return pool.reduce((best, card) => {
    const sum = Object.values(card.influence).reduce((a, b) => a + b, 0);
    const bestSum = Object.values(best.influence).reduce((a, b) => a + b, 0);
    return sum > bestSum ? card : best;
  });
}

/** AI 배틀 픽 */
export function aiBattlePick(
  hand: BattleCard[],
  currentDomain: Domain,
  _nextDomain: Domain | null,
  _difficulty: AiDifficulty = "normal",
  playerHand: BattleCard[] = [],
  aiScore: number = 0,
  playerScore: number = 0,
  remainingRounds: number = 1,
  futureDomains: Domain[] = [],
): AiBattleResult {
  return smartPick(hand, currentDomain, playerHand, aiScore, playerScore, remainingRounds, futureDomains);
}
