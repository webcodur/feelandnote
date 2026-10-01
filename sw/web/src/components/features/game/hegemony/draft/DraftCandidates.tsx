/*
  파일명: components/features/game/hegemony/draft/DraftCandidates.tsx
  기능: 선발 후보 세 명
  책임: 지금 묶음의 세 인물을 크게 보여 준다. 누가 뽑았는지·제외됐는지 표시하고, 내 명단을 얼마나 메우는지 알려 준다.
*/
"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { BattleCard, Command } from "@/lib/game/types";
import { COMMANDS } from "@/lib/game/types";
import { baseAptitude, displayAptitude } from "@/lib/game/hegemony/aptitude";
import type { Side } from "@/lib/game/hegemony/types";
import { useHegemonyText } from "../text";
import HeroCard from "../ui/HeroCard";
import { COMMAND_TONE } from "../ui/tokens";
import { teamBest } from "./TeamStrength";

interface Props {
  batch: number;
  cards: BattleCard[];
  owner: Map<string, Side>;
  excluded: Set<string>;
  mine: readonly BattleCard[];
  canPick: boolean;
  onPick: (card: BattleCard) => void;
  onInspect: (cardId: string) => void;
}

/** 이 인물이 들어오면 내 명단의 명령별 최고 적성이 얼마나 오르는가 */
function gains(card: BattleCard, mine: readonly BattleCard[]): { command: Command; gain: number }[] {
  if (mine.length === 0) return [];
  const best = teamBest(mine);
  return COMMANDS.map((command) => ({ command, gain: displayAptitude(baseAptitude(card, command) - best[command]) })).filter((g) => g.gain > 0);
}

export default function DraftCandidates({ batch, cards, owner, excluded, mine, canPick, onPick, onInspect }: Props) {
  const text = useHegemonyText();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={batch}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="grid w-full grid-cols-3 gap-2.5 sm:gap-4 lg:gap-6"
      >
        {cards.map((card, i) => {
          const side = owner.get(card.id);
          const isExcluded = excluded.has(card.id);
          const tag = isExcluded ? { label: text.draft.excluded, tone: "muted" as const } : null;
          const open = canPick && !side && !isExcluded;
          const plus = open ? gains(card, mine) : [];
          return (
            <div key={card.id} className="flex min-w-0 flex-col gap-2">
              {!side && (
                <motion.div layoutId={`draft-${card.id}`} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
                  <HeroCard
                    card={card}
                    dimmed={isExcluded}
                    tag={tag}
                    hotkey={open ? String(i + 1) : undefined}
                    onSelect={open ? () => onPick(card) : undefined}
                    onInspect={() => onInspect(card.id)}
                  />
                </motion.div>
              )}
              {side && <div className="aspect-[3/4] rounded-xl border border-dashed border-hg-line/60" />}
              <div className="flex min-h-6 flex-wrap justify-center gap-1">
                {plus.map((g) => (
                  <span key={g.command} className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-sm font-bold ${COMMAND_TONE[g.command].soft} ${COMMAND_TONE[g.command].text}`}>
                    {text.command.name[g.command]} +{g.gain}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
