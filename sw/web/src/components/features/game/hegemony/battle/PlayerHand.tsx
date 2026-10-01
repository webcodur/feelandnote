/*
  파일명: components/features/game/hegemony/battle/PlayerHand.tsx
  기능: 내 손패
  책임: 낼 수 있는 인물을 앞에, 쉬는 인물을 뒤에 흐리게 늘어놓는다. 적성은 주장·천명 보정까지 넣어 보여 준다.
*/
"use client";

import { motion } from "framer-motion";
import type { BattleCard, Command } from "@/lib/game/types";
import { aptitudeSet, captainEffectOf } from "@/lib/game/hegemony/aptitude";
import type { SideState } from "@/lib/game/hegemony/types";
import { useHegemonyText } from "../text";
import HeroCard from "../ui/HeroCard";

interface Props {
  side: SideState;
  mandate: Command | null;
  selectedId: string | null;
  activeCommand: Command | null;
  enabled: boolean;
  onSelect: (card: BattleCard) => void;
  onInspect: (cardId: string) => void;
}

export default function PlayerHand({ side, mandate, selectedId, activeCommand, enabled, onSelect, onInspect }: Props) {
  const text = useHegemonyText();
  return (
    <div className="grid grid-cols-5 items-end gap-1.5 sm:gap-2.5 lg:gap-3">
      {side.hand.map((card, i) => {
        const selected = card.id === selectedId;
        return (
          <motion.div
            key={card.id}
            layout
            animate={{ y: selected ? -12 : 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <HeroCard
              card={card}
              selected={selected}
              captain={card.id === side.captainId}
              activeCommand={selected ? activeCommand : null}
              aptitudes={aptitudeSet(card, captainEffectOf(card, side), mandate)}
              showTitle={false}
              lowPortrait
              hotkey={enabled ? String(i + 1) : undefined}
              onSelect={enabled ? () => onSelect(card) : undefined}
              onInspect={() => onInspect(card.id)}
            />
          </motion.div>
        );
      })}
      {side.used.map((card) => (
        <motion.div key={card.id} layout>
          <HeroCard card={card} dimmed captain={card.id === side.captainId} showTitle={false} lowPortrait tag={{ label: text.battle.resting, tone: "muted" }} />
        </motion.div>
      ))}
    </div>
  );
}
