/*
  파일명: lib/game/hegemony/hand.ts
  기능: 진영 생성과 손패 복귀
  책임: 대전 시작 상태를 만들고, 손패가 빈 진영이 쉬던 인물 한 명을 다시 불러오는 규칙을 담당한다.
*/

import type { BattleCard } from "../types";
import { RULES } from "./constants";
import { totalAptitude } from "./aptitude";
import { sample } from "./rng";
import type { Rng, SideState } from "./types";

export function createSide(hand: BattleCard[], captainId: string | null): SideState {
  return {
    hand,
    used: [],
    nation: { power: RULES.initialPower, morale: RULES.initialMorale },
    captainId,
    duelsLeft: RULES.duelsPerGame,
  };
}

/** 손패가 비어 이번 라운드에 인물을 불러와야 하는가 */
export function needsRecall(side: SideState): boolean {
  return side.hand.length === 0 && side.used.length > 0;
}

/** 불러올 후보 — 쉬던 인물 가운데 무작위로 최대 RULES.recallChoices명 */
export function recallCandidates(side: SideState, rng: Rng): BattleCard[] {
  return sample(side.used, RULES.recallChoices, rng);
}

/** 쉬던 인물 한 명을 손패로 되돌린다 */
export function recallCard(side: SideState, cardId: string): SideState {
  const card = side.used.find((c) => c.id === cardId);
  if (!card) return side;
  return { ...side, hand: [...side.hand, card], used: side.used.filter((c) => c.id !== cardId) };
}

/** AI는 후보 가운데 적성 합이 가장 큰 인물을 불러온다 */
export function bestRecall(candidates: readonly BattleCard[]): BattleCard | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => (totalAptitude(c) > totalAptitude(best) ? c : best), candidates[0]);
}

/** 주장이 지금 손패에 있는가 (오라 발동 여부) */
export function captainInHand(side: Pick<SideState, "hand" | "captainId">): boolean {
  return !!side.captainId && side.hand.some((c) => c.id === side.captainId);
}
