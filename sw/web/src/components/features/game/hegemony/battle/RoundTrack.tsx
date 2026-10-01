/*
  파일명: components/features/game/hegemony/battle/RoundTrack.tsx
  기능: 라운드·천명 표시
  책임: 지금 라운드와 남은 라운드, 이번 천명과 다음 두 라운드 천명 예보, 공격 격화 배율을 한 줄에 보여 준다.
*/
"use client";

import { Flame } from "lucide-react";
import type { Command } from "@/lib/game/types";
import { RULES, escalationOf } from "@/lib/game/hegemony/constants";
import { mandateOfRound } from "@/lib/game/hegemony/mandate";
import { useHegemonyText } from "../text";
import CommandSeal from "../ui/CommandSeal";

interface Props {
  round: number;
  mandates: Command[];
}

export default function RoundTrack({ round, mandates }: Props) {
  const text = useHegemonyText();
  const now = mandateOfRound(mandates, round);
  const next = [round + 1, round + 2].map((r) => mandateOfRound(mandates, r));
  const escalation = escalationOf(round);
  const final = round >= RULES.maxRounds;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 whitespace-nowrap lg:flex-col lg:gap-1.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-bold text-text-secondary">{final ? text.outcome.finalRound : text.battle.roundLabel}</span>
        <span className="text-2xl font-black leading-none tabular-nums text-hg-bright lg:text-3xl">{round}</span>
        <span className="text-sm font-bold tabular-nums text-text-tertiary">/ {RULES.maxRounds}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {now && (
          <span className="flex items-center gap-1.5 rounded-full border border-hg-mandate/60 bg-hg-mandate/10 py-0.5 pe-2.5 ps-0.5">
            <CommandSeal command={now} size="xs" solid />
            {/* 폰에서는 금색 칩과 명령 도장만으로 천명임이 드러나므로 낱말을 읽기 도구에만 남겨 라운드 줄을 한 줄로 지킨다 */}
            <span className="text-sm font-bold text-hg-mandate">
              <span className="sr-only sm:not-sr-only">{text.battle.mandate} </span>
              {text.battle.mandateNow(now)}
            </span>
          </span>
        )}
        {next.some(Boolean) && (
          <span className="flex items-center gap-1" aria-label={text.battle.mandateNext}>
            <span className="text-sm font-semibold text-text-secondary">{text.battle.mandateNext}</span>
            {next.map((cmd, i) => cmd && <CommandSeal key={i} command={cmd} size="xs" className={i === 1 ? "opacity-60" : ""} />)}
          </span>
        )}
        {escalation > 1 && (
          <span className="flex items-center gap-1 rounded-full border border-hg-assault/50 bg-hg-assault/10 px-2 py-0.5 text-sm font-bold text-hg-assault">
            <Flame size={14} />
            {text.battle.escalationValue(escalation)}
          </span>
        )}
      </div>
    </div>
  );
}
