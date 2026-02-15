/*
  파일명: lib/game/deckBuilder.ts
  기능: 드래프트 풀 생성
  책임: 658명 중 등급 분포에 맞게 12명을 선택한다.
*/

import type { BattleCard, Tier } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count);
}

/**
 * 12명 풀 생성
 * S/A 2명, B/C 4명, D/E 4명, 랜덤 2명
 */
export function buildDraftPool(allCards: BattleCard[]): BattleCard[] {
  const byTier: Record<string, BattleCard[]> = { SA: [], BC: [], DE: [] };

  for (const card of allCards) {
    if (card.tier === "S" || card.tier === "A") byTier.SA.push(card);
    else if (card.tier === "B" || card.tier === "C") byTier.BC.push(card);
    else byTier.DE.push(card);
  }

  const sa = pickRandom(byTier.SA, 2);
  const bc = pickRandom(byTier.BC, 4);
  const de = pickRandom(byTier.DE, 4);

  const picked = new Set([...sa, ...bc, ...de].map((c) => c.id));
  const remaining = allCards.filter((c) => !picked.has(c.id));
  const wild = pickRandom(remaining, 2);

  return shuffle([...sa, ...bc, ...de, ...wild]);
}

/**
 * 총점(6개 영역 합 + 통시성) → 등급
 * 총점 범위: 0-100 (영역 0-60 + 통시성 0-40)
 */
export function toTier(totalScore: number): Tier {
  if (totalScore >= 75) return "S";
  if (totalScore >= 60) return "A";
  if (totalScore >= 45) return "B";
  if (totalScore >= 30) return "C";
  if (totalScore >= 15) return "D";
  return "E";
}
