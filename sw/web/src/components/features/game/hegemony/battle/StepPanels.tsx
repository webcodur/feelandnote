/*
  파일명: components/features/game/hegemony/battle/StepPanels.tsx
  기능: 대전 중 선택 패널
  책임: 손패가 비었을 때 불러올 인물 고르기, 같은 명령 접전에서 일기토 신청 여부 묻기를 무대 가운데에 띄운다.
*/
"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import type { BattleCard } from "@/lib/game/types";
import { useHegemonyText } from "../text";
import GameButton from "../ui/GameButton";
import HeroCard from "../ui/HeroCard";
import { PANEL } from "../ui/tokens";

const POP = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.25, ease: "easeOut" },
} as const;

export function RecallPanel({ options, onPick }: { options: BattleCard[]; onPick: (card: BattleCard) => void }) {
  const text = useHegemonyText();
  return (
    <motion.div {...POP} className={`${PANEL} w-full max-w-md p-4`}>
      <h3 className="text-lg font-black text-hg-bright">{text.battle.recallTitle}</h3>
      <p className="mt-1 text-sm leading-relaxed text-text-primary">{text.battle.recallGuide}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {options.map((card, i) => (
          <HeroCard key={card.id} card={card} hotkey={String(i + 1)} onSelect={() => onPick(card)} selectLabel={`${text.battle.recallPick} ${card.nickname}`} />
        ))}
      </div>
    </motion.div>
  );
}

interface DuelProps {
  mine: number;
  theirs: number;
  /** 적성이 정확히 같은가 (표시값이 같아도 소수점에서 갈릴 수 있다) */
  tie: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function DuelOfferPanel({ mine, theirs, tie, onAccept, onDecline }: DuelProps) {
  const text = useHegemonyText();
  return (
    <motion.div {...POP} className={`${PANEL} w-full max-w-md border-hg-mandate/50 p-4`}>
      <div className="flex items-center gap-2">
        <Swords className="text-hg-mandate" size={20} />
        <h3 className="text-lg font-black text-hg-bright">{text.duel.title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text-primary">{tie ? text.duel.tie(mine) : text.duel.body(mine, theirs)}</p>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">{text.duel.stake}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <GameButton variant="primary" hotkey="1" onClick={onAccept}>{text.duel.accept}</GameButton>
        <GameButton hotkey="2" onClick={onDecline}>{text.duel.decline}</GameButton>
      </div>
    </motion.div>
  );
}
