/*
  파일명: components/features/game/hegemony/battle/useBattleHotkeys.ts
  기능: 대전 단축키
  책임: 단계마다 숫자·Q/W/E·Enter·Space를 해당 동작에 붙인다. 일기토 중에는 일기토 화면이 자판을 쓰므로 끈다.
*/
"use client";

import type { BattleCard, Command } from "@/lib/game/types";
import type { BattleStep } from "@/lib/game/hegemony/session/types";
import { useHotkeys, type HotkeyMap } from "../hooks/useHotkeys";

interface Handlers {
  step: BattleStep;
  hand: readonly BattleCard[];
  recallOptions: readonly BattleCard[];
  chooseCard: (card: BattleCard) => void;
  chooseCommand: (command: Command) => void;
  deploy: () => void;
  skipReveal: () => void;
  next: () => void;
  recall: (cardId: string) => void;
  acceptDuel: () => void;
  declineDuel: () => void;
}

export function useBattleHotkeys(h: Handlers) {
  const keys: Partial<Record<BattleStep, HotkeyMap>> = {
    plan: {
      ...Object.fromEntries(h.hand.map((c, i) => [String(i + 1), () => h.chooseCard(c)])),
      q: () => h.chooseCommand("assault"),
      w: () => h.chooseCommand("stratagem"),
      e: () => h.chooseCommand("govern"),
      Enter: h.deploy,
      " ": h.deploy,
    },
    reveal: { Enter: h.skipReveal, " ": h.skipReveal },
    outcome: { Enter: h.next, " ": h.next },
    recall: Object.fromEntries(h.recallOptions.map((c, i) => [String(i + 1), () => h.recall(c.id)])),
    duelOffer: { "1": h.acceptDuel, "2": h.declineDuel },
  };
  useHotkeys(keys[h.step] ?? {}, h.step !== "duel");
}
