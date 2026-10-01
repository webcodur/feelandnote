/*
  파일명: components/features/game/hegemony/battle/useBattleFlow.ts
  기능: 대전 화면 박자와 고르기 상태
  책임: 라운드마다 고른 인물·명령·불러올 인물을 들고, 공개 연출 단계(뒷면→뒤집기→판정)를 시간에 맞춰 넘긴다.
        라운드가 바뀌면 고르기 상태는 저절로 비워진다(라운드 번호를 함께 저장해 비교한다).
*/
"use client";

import { useEffect, useState } from "react";
import type { Command } from "@/lib/game/types";
import type { BattleState } from "@/lib/game/hegemony/session/types";
import type { SfxName } from "../hooks/useHegemonyAudio";
import type { RevealStage } from "./Arena";

const CLASH_SFX: Record<Command, SfxName> = { assault: "clashAssault", stratagem: "clashStratagem", govern: "clashGovern" };
export const REVEAL_MS = { flip: 380, verdict: 950, done: 1650 } as const;

interface Pick {
  round: number;
  cardId: string | null;
  command: Command | null;
  recoverId: string | null;
}

export function useBattleFlow(battle: BattleState, speed: number, sfx: (name: SfxName) => void, onRevealDone: () => void) {
  const { round, step, plays } = battle;
  const [pick, setPick] = useState<Pick>({ round, cardId: null, command: null, recoverId: null });
  const [reveal, setReveal] = useState<{ round: number; stage: RevealStage }>({ round, stage: 0 });

  const current = pick.round === round ? pick : { round, cardId: null, command: null, recoverId: null };
  const update = (patch: Partial<Omit<Pick, "round">>) => setPick({ ...current, ...patch, round });

  // 공개 단계 박자: 뒷면 → 뒤집기(효과음) → 판정(명령별 효과음) → 결산
  useEffect(() => {
    if (step !== "reveal" || !plays) return;
    sfx("deploy");
    const mirror = plays.player.command === plays.ai.command;
    const timers = [
      setTimeout(() => {
        setReveal({ round, stage: 1 });
        sfx("reveal");
      }, REVEAL_MS.flip * speed),
      setTimeout(() => {
        setReveal({ round, stage: 2 });
        sfx(mirror ? "clang" : CLASH_SFX[plays.player.command]);
      }, REVEAL_MS.verdict * speed),
      setTimeout(onRevealDone, REVEAL_MS.done * speed),
    ];
    return () => timers.forEach(clearTimeout);
  }, [step, plays, round, speed, sfx, onRevealDone]);

  const liveStage: RevealStage = reveal.round === round ? reveal.stage : 0;
  const stage: RevealStage = step === "reveal" ? liveStage : step === "plan" || step === "recall" ? 0 : 2;

  return {
    cardId: current.cardId,
    command: current.command,
    recoverId: current.recoverId,
    stage,
    selectCard: (cardId: string | null) => update({ cardId }),
    selectCommand: (command: Command | null) => update({ command, recoverId: command === "govern" ? current.recoverId : null }),
    selectRecover: (recoverId: string) => update({ recoverId }),
  };
}
