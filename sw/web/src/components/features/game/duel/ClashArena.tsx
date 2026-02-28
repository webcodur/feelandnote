/*
  파일명: components/features/game/duel/ClashArena.tsx
  기능: 접전(draw) 미니게임 분기 래퍼
  책임: command에 따라 DuelArena / RhythmArena / SimonArena로 분기한다.
*/
"use client";

import type { BattleCard, Command } from "@/lib/game/types";
import DuelArena from "./DuelArena";
import RhythmArena from "./RhythmArena";
import SimonArena from "./SimonArena";

interface Props {
  playerCard: BattleCard;
  aiCard: BattleCard;
  command: Command;
  onComplete: (winner: "player" | "ai" | "draw") => void;
}

export default function ClashArena({ playerCard, aiCard, command, onComplete }: Props) {
  switch (command) {
    case "stratagem":
      return <DuelArena playerCard={playerCard} aiCard={aiCard} command={command} onComplete={onComplete} />;
    case "assault":
      return <RhythmArena playerCard={playerCard} aiCard={aiCard} onComplete={onComplete} />;
    case "govern":
      return <SimonArena playerCard={playerCard} aiCard={aiCard} onComplete={onComplete} />;
  }
}
