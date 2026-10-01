/*
  파일명: components/features/game/hegemony/result/resultStats.ts
  기능: 결과 화면 집계
  책임: 라운드 기록에서 준 피해·받은 피해·상성 우위·반란 수와 가장 활약한 내 인물을 뽑는다.
*/

import type { RoundRecord } from "@/lib/game/hegemony/types";

export interface ResultStats {
  dealt: number;
  taken: number;
  counters: number;
  rebellions: { player: number; ai: number };
  mvp: { cardId: string; dealt: number; healed: number } | null;
}

export function resultStats(records: readonly RoundRecord[]): ResultStats {
  const byCard = new Map<string, { dealt: number; healed: number }>();
  let dealt = 0;
  let taken = 0;
  for (const r of records) {
    const mine = r.player.dealtPower + r.player.dealtMorale;
    dealt += mine;
    taken += r.ai.dealtPower + r.ai.dealtMorale;
    const prev = byCard.get(r.player.cardId) ?? { dealt: 0, healed: 0 };
    byCard.set(r.player.cardId, { dealt: prev.dealt + mine, healed: prev.healed + r.player.healedPower + r.player.healedMorale });
  }
  const ranked = [...byCard.entries()].sort((a, b) => b[1].dealt + b[1].healed - (a[1].dealt + a[1].healed));
  const top = ranked[0];
  return {
    dealt,
    taken,
    counters: records.filter((r) => r.verdict === "win").length,
    rebellions: {
      player: records.filter((r) => r.change.player.rebellion > 0).length,
      ai: records.filter((r) => r.change.ai.rebellion > 0).length,
    },
    mvp: top ? { cardId: top[0], ...top[1] } : null,
  };
}
