/*
  파일명: lib/game/aiPlayer.ts
  기능: 패권 v6 동시 행동 AI
  책임: 플레이어 행동을 모르는 상태에서 카드+명령을 선택한다.
*/

import type { BattleCard, Command, NationState, RoundRecord } from "./types";
import { COMMANDS } from "./types";
import { calcAptitude, calcAptitudeWithCaptain, getCounterResult } from "./gameEngine";

interface AiRoundParams {
  hand: BattleCard[];
  aiNation: NationState;
  playerNation: NationState;
  playerHand: BattleCard[];     // 오픈 정보
  aiDiscard: BattleCard[];
  roundRecords: RoundRecord[];
  currentRound: number;
  mandateCommand?: Command;     // 현재 천명 보너스 명령
  aiCaptainId?: string | null;  // AI 주장 카드 ID
}

export interface AiRoundChoice {
  cardId: string;
  command: Command;
  recoverId?: string;
}

/** 최근 N라운드에서 플레이어가 가장 많이 사용한 명령 예측 */
function predictPlayerCommand(records: RoundRecord[], lookback: number = 3): Command | null {
  if (records.length === 0) return null;

  const recent = records.slice(-lookback);
  const counts: Record<Command, number> = {
    assault: 0, stratagem: 0, govern: 0,
  };
  for (const r of recent) {
    counts[r.player.command]++;
  }

  let maxCmd: Command = "assault";
  let maxCount = 0;
  for (const cmd of COMMANDS) {
    if (counts[cmd] > maxCount) {
      maxCount = counts[cmd];
      maxCmd = cmd;
    }
  }
  return maxCount > 0 ? maxCmd : null;
}

/** AI 라운드 선택: 카드+명령 (플레이어 행동 모르는 상태) */
export function aiSelectRound(params: AiRoundParams): AiRoundChoice {
  const {
    hand, aiNation, playerNation,
    aiDiscard, roundRecords, currentRound, mandateCommand,
    aiCaptainId,
  } = params;

  if (hand.length === 0) {
    return { cardId: "", command: "govern" };
  }

  // ─── 전략 가중치 ───
  const weights: Record<Command, number> = {
    assault: 1.0,
    stratagem: 1.0,
    govern: 0.7,
  };

  const powerAdvantage = aiNation.power - playerNation.power;
  const aiMoraleCritical = aiNation.morale <= 15;
  const hasDiscard = aiDiscard.length > 0;
  const isLateGame = currentRound >= 5;

  // 상황별 조정
  if (powerAdvantage > 5) {
    weights.assault = 1.5;
  }
  if (aiMoraleCritical) {
    weights.govern = 2.0;
    weights.assault = 0.5;
  }
  if (!hasDiscard) {
    weights.govern *= 0.5;
  }
  if (isLateGame && powerAdvantage >= 0) {
    weights.assault = 1.8;
  }
  if (hand.length <= 2) {
    weights.govern = 1.5;
    weights.assault = 0.6;
  }

  // ─── 예측 기반 상성 가중치 ───
  const predictedCmd = predictPlayerCommand(roundRecords);
  if (predictedCmd) {
    for (const cmd of COMMANDS) {
      const counter = getCounterResult(cmd, predictedCmd);
      if (counter === "win") {
        weights[cmd] *= 1.3;
      } else if (counter === "lose") {
        weights[cmd] *= 0.8;
      }
    }
  }

  // ─── 모든 카드 x 명령 조합 평가 ───
  let bestScore = -Infinity;
  let bestChoice: AiRoundChoice = {
    cardId: hand[0].id,
    command: "assault",
  };

  for (const card of hand) {
    for (const cmd of COMMANDS) {
      if (weights[cmd] === 0) continue;

      const captainInHand = !!aiCaptainId && hand.some(c => c.id === aiCaptainId);
      const rawApt = calcAptitudeWithCaptain(card, cmd, aiCaptainId ?? null, captainInHand);
      const apt = mandateCommand === cmd ? rawApt * 1.5 : rawApt;
      let score = apt * weights[cmd];

      if (cmd === "govern" && !hasDiscard) {
        score *= 0.5;
      }

      // 랜덤성 추가
      score += Math.random() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestChoice = { cardId: card.id, command: cmd };
      }
    }
  }

  // 내정 시 회수할 카드 선택
  if (bestChoice.command === "govern" && aiDiscard.length > 0) {
    bestChoice.recoverId = aiSelectRecovery(aiDiscard);
  }

  return bestChoice;
}

/**
 * AI 주장 선택: 종합 적성이 중간인 카드를 선택한다.
 * 최강 카드보다 중간 카드를 주장으로 두면 오라(+15%)가 더 효율적이다.
 */
export function aiSelectCaptain(hand: BattleCard[]): string {
  if (hand.length <= 1) return hand[0].id;

  const scored = hand.map(card => {
    let total = 0;
    for (const cmd of COMMANDS) total += calcAptitude(card, cmd);
    return { id: card.id, total };
  }).sort((a, b) => b.total - a.total);

  // 중간 순위 카드 선택 (2~3번째), 약간의 랜덤성
  const midIdx = Math.min(1 + Math.floor(Math.random() * 2), scored.length - 1);
  return scored[midIdx].id;
}

/** AI 내정 시 회수할 카드 선택: 종합 적성 최고 */
function aiSelectRecovery(discard: BattleCard[]): string | undefined {
  if (discard.length === 0) return undefined;

  let bestCard = discard[0];
  let bestScore = -Infinity;

  for (const card of discard) {
    let score = 0;
    for (const cmd of COMMANDS) {
      score += calcAptitude(card, cmd);
    }
    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  return bestCard.id;
}
