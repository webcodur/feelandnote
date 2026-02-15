/*
  파일명: lib/game/gameEngine.ts
  기능: 영향력 대전 게임 엔진
  책임: 라운드 채점, 타이브레이크 판정, 승패 결정을 담당한다.
*/

import type { BattleCard, Domain, RoundResult } from "./types";
import { TIER_RANK } from "./types";

/** 라운드 채점 */
export function resolveRound(
  domain: Domain,
  playerCard: BattleCard,
  aiCard: BattleCard,
  aiStrategy?: string,
): RoundResult {
  const playerScore = playerCard.influence[domain];
  const aiScore = aiCard.influence[domain];

  let pointsAwarded = { player: 0, ai: 0 };
  let isTiebreak = false;

  if (playerScore > aiScore) {
    pointsAwarded.player = 1;
  } else if (aiScore > playerScore) {
    pointsAwarded.ai = 1;
  } else {
    // 동점 → 등급(통시성) 비교
    isTiebreak = true;
    const pRank = TIER_RANK[playerCard.tier];
    const aRank = TIER_RANK[aiCard.tier];
    if (pRank > aRank) {
      pointsAwarded.player = 1;
    } else if (aRank > pRank) {
      pointsAwarded.ai = 1;
    }
    // 등급도 동일 → 양쪽 0점
  }

  return {
    domain,
    playerCard,
    aiCard,
    playerDomainScore: playerScore,
    aiDomainScore: aiScore,
    pointsAwarded,
    isTiebreak,
    aiStrategy,
  };
}

/** 영역 순서 랜덤 셔플 */
export function shuffleDomains(domains: Domain[]): Domain[] {
  const arr = [...domains];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
