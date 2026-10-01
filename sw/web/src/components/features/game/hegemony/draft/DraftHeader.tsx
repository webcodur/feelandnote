/*
  파일명: components/features/game/hegemony/draft/DraftHeader.tsx
  기능: 선발 머리줄
  책임: 묶음 진행 점, 지금 누구 차례인지, 다시 뽑기·자동 선발 단추를 보여 준다.
*/
"use client";

import { Shuffle, Zap } from "lucide-react";
import { RULES } from "@/lib/game/hegemony/constants";
import type { Side } from "@/lib/game/hegemony/types";
import { useHegemonyText } from "../text";
import GameButton from "../ui/GameButton";

interface Props {
  batch: number;
  turn: Side | "done" | "wait";
  firstPicker: Side | null;
  canReshuffle: boolean;
  onReshuffle: () => void;
  onAuto: () => void;
}

const TURN_TONE = {
  player: "border-accent/60 bg-accent/15 text-accent",
  ai: "border-hg-enemy/50 bg-hg-enemy/10 text-hg-enemy",
  done: "border-hg-govern/50 bg-hg-govern/10 text-hg-govern",
  wait: "border-hg-line bg-hg-raised text-text-secondary",
} as const;

export default function DraftHeader({ batch, turn, firstPicker, canReshuffle, onReshuffle, onAuto }: Props) {
  const text = useHegemonyText();
  const label = { player: text.draft.myTurn, ai: text.draft.aiTurn, done: text.draft.done, wait: text.draft.aiTurn }[turn];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black text-hg-bright">{text.draft.title}</h2>
        <div className="flex items-center gap-1.5" aria-label={text.draft.batch(batch + 1, RULES.draftBatches)}>
          {Array.from({ length: RULES.draftBatches }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i < batch ? "w-4 bg-accent/60" : i === batch ? "w-7 bg-accent" : "w-4 bg-hg-line"}`} />
          ))}
          <span className="ms-2 text-sm font-bold tabular-nums text-text-secondary">{text.draft.batch(batch + 1, RULES.draftBatches)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-bold ${TURN_TONE[turn]}`}>
          {(turn === "ai" || turn === "wait") && <span className="size-2 animate-pulse rounded-full bg-current" />}
          {label}
        </span>
        {firstPicker && turn !== "done" && <span className="hidden text-sm text-text-secondary md:inline">{text.draft.first(firstPicker === "player")}</span>}
        {canReshuffle && (
          <GameButton size="sm" onClick={onReshuffle} icon={<Shuffle size={15} />}>
            {text.draft.reshuffle}
          </GameButton>
        )}
        {turn !== "done" && (
          <GameButton size="sm" onClick={onAuto} icon={<Zap size={15} />}>
            {text.draft.auto}
          </GameButton>
        )}
      </div>
    </div>
  );
}
