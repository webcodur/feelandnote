/*
  파일명: components/features/game/hegemony/battle/useOutcomeCue.ts
  기능: 라운드 결과 신호
  책임: 결과가 나오면 판정 효과음·반란 효과음과 내 출전 인물의 대사를 라운드마다 한 번 낸다.
*/
"use client";

import { useEffect, useEffectEvent } from "react";
import type { BattleCard } from "@/lib/game/types";
import type { RoundRecord } from "@/lib/game/hegemony/types";
import type { ScreenCommon } from "../screenTypes";

const VERDICT_SFX = { win: "roundWin", lose: "roundLose", draw: "roundDraw" } as const;
const VERDICT_LINE = { win: "battle_win", lose: "battle_lose", draw: "battle_draw" } as const;

export function useOutcomeCue(outcome: RoundRecord | null, cards: ReadonlyMap<string, BattleCard>, sfx: ScreenCommon["sfx"], say: ScreenCommon["say"]) {
  const announce = useEffectEvent((record: RoundRecord) => {
    sfx(VERDICT_SFX[record.verdict]);
    if (record.change.player.rebellion > 0 || record.change.ai.rebellion > 0) sfx("rebellion");
    const card = cards.get(record.player.cardId);
    if (card) say(card, VERDICT_LINE[record.verdict]);
  });
  useEffect(() => {
    if (outcome) announce(outcome);
  }, [outcome]);
}
