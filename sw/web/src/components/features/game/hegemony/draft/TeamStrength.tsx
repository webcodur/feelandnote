/*
  파일명: components/features/game/hegemony/draft/TeamStrength.tsx
  기능: 명단 전력 막대
  책임: 명단의 명령별 최고 적성을 막대로 보여 준다. 어느 명령이 비었는지 한눈에 보인다.
*/
"use client";

import { Fragment } from "react";
import type { BattleCard, Command } from "@/lib/game/types";
import { COMMANDS } from "@/lib/game/types";
import { baseAptitude, displayAptitude } from "@/lib/game/hegemony/aptitude";
import { useHegemonyText } from "../text";
import { COMMAND_TONE } from "../ui/tokens";

/** 적성 막대의 만점 (주장·천명 보정 없는 기본 적성 기준) */
const APTITUDE_SCALE = 20;

export function teamBest(cards: readonly BattleCard[]): Record<Command, number> {
  const best: Record<Command, number> = { assault: 0, stratagem: 0, govern: 0 };
  for (const card of cards) for (const cmd of COMMANDS) best[cmd] = Math.max(best[cmd], baseAptitude(card, cmd));
  return best;
}

export default function TeamStrength({ cards, hidden = false }: { cards: readonly BattleCard[]; hidden?: boolean }) {
  const text = useHegemonyText();
  const best = teamBest(cards);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-text-secondary">{text.draft.teamBest}</p>
      {/* 명령 이름 칸은 가장 긴 이름에 맞춘다. 영어 Scheme·Govern이 막대를 덮지 않게 한다 */}
      <div className="grid grid-cols-[max-content_minmax(0,1fr)_1.5rem] items-center gap-x-2 gap-y-1.5">
        {COMMANDS.map((cmd) => (
          <Fragment key={cmd}>
            <span className={`text-sm font-bold ${COMMAND_TONE[cmd].text}`}>{text.command.name[cmd]}</span>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-hg-line/70">
              {!hidden && (
                <span
                  className={`absolute inset-y-0 start-0 rounded-full ${COMMAND_TONE[cmd].fill}`}
                  style={{ width: `${Math.min(100, (best[cmd] / APTITUDE_SCALE) * 100)}%` }}
                />
              )}
            </span>
            <span className="text-end text-sm font-bold tabular-nums text-hg-bright">{hidden ? "?" : displayAptitude(best[cmd])}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
