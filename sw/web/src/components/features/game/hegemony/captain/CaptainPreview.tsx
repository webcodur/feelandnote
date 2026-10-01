/*
  파일명: components/features/game/hegemony/captain/CaptainPreview.tsx
  기능: 주장 효과 미리보기
  책임: 고른 인물을 주장으로 세웠을 때 동료의 적성이 얼마나 오르는지, 본인이 나서면 얼마가 되는지 숫자로 보여 준다.
*/
"use client";

import { ArrowRight } from "lucide-react";
import type { BattleCard } from "@/lib/game/types";
import { COMMANDS } from "@/lib/game/types";
import { RULES } from "@/lib/game/hegemony/constants";
import { baseAptitude, bestCommandOf, displayAptitude } from "@/lib/game/hegemony/aptitude";
import { useHegemonyText } from "../text";
import CommandSeal from "../ui/CommandSeal";
import { PANEL } from "../ui/tokens";

export default function CaptainPreview({ captain, team }: { captain: BattleCard; team: readonly BattleCard[] }) {
  const text = useHegemonyText();
  const others = team.filter((c) => c.id !== captain.id);
  return (
    <div className={`${PANEL} grid w-full gap-4 p-4 md:grid-cols-2`}>
      <section>
        <h3 className="mb-2 text-sm font-black text-accent">{text.captain.auraTitle}</h3>
        <ul className="space-y-1.5">
          {others.map((card) => {
            const cmd = bestCommandOf(card);
            const base = baseAptitude(card, cmd);
            return (
              <li key={card.id} className="flex items-center gap-2 text-sm">
                <CommandSeal command={cmd} size="xs" />
                <span className="min-w-0 flex-1 truncate text-text-primary">{card.nickname}</span>
                <span className="tabular-nums text-text-secondary">{displayAptitude(base)}</span>
                <ArrowRight size={13} className="text-text-tertiary" />
                <span className="w-6 text-end font-black tabular-nums text-accent">{displayAptitude(base * (1 + RULES.captainAura))}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-black text-accent">{text.captain.selfTitle(captain.nickname)}</h3>
        <ul className="space-y-1.5">
          {COMMANDS.map((cmd) => {
            const base = baseAptitude(captain, cmd);
            return (
              <li key={cmd} className="flex items-center gap-2 text-sm">
                <CommandSeal command={cmd} size="xs" />
                <span className="min-w-0 flex-1 text-text-primary">{text.command.name[cmd]}</span>
                <span className="tabular-nums text-text-secondary">{displayAptitude(base)}</span>
                <ArrowRight size={13} className="text-text-tertiary" />
                <span className="w-6 text-end font-black tabular-nums text-accent">{displayAptitude(base * RULES.captainSelf)}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{text.captain.tip}</p>
      </section>
    </div>
  );
}
