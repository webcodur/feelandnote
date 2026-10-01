/*
  파일명: components/features/game/hegemony/draft/RosterPanel.tsx
  기능: 선발 명단
  책임: 한 진영이 뽑은 인물 다섯 자리와 명령별 전력을 보여 준다. 새로 뽑힌 인물은 후보 자리에서 날아와 앉는다.
*/
"use client";

import { motion } from "framer-motion";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard } from "@/lib/game/types";
import { RULES } from "@/lib/game/hegemony/constants";
import { baseAptitude, bestCommandOf, displayAptitude } from "@/lib/game/hegemony/aptitude";
import type { Side } from "@/lib/game/hegemony/types";
import { useHegemonyText } from "../text";
import CommandSeal from "../ui/CommandSeal";
import { FOCUS_RING, PANEL, SIDE_TONE } from "../ui/tokens";
import TeamStrength from "./TeamStrength";

interface Props {
  side: Side;
  title: string;
  cards: readonly BattleCard[];
  hideStats?: boolean;
  active?: boolean;
  onInspect?: (cardId: string) => void;
}

function Slot({ card, hideStats, onInspect }: { card: BattleCard; hideStats: boolean; onInspect?: (id: string) => void }) {
  const best = bestCommandOf(card);
  return (
    <motion.button
      type="button"
      layoutId={`draft-${card.id}`}
      onClick={() => onInspect?.(card.id)}
      className={`flex w-full items-center gap-2.5 rounded-xl border border-hg-line/70 bg-hg-raised p-1.5 text-start hover:border-accent/60 ${FOCUS_RING}`}
    >
      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-hg-ink">
        {card.avatarUrl && <CelebAvatarImage src={card.avatarUrl} alt="" className="object-cover object-top" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-hg-bright">{card.nickname}</span>
        <span className="block truncate text-sm text-text-secondary">{card.title}</span>
      </span>
      {!hideStats && (
        <span className="flex shrink-0 items-center gap-1">
          <CommandSeal command={best} size="xs" />
          <span className="w-5 text-end text-sm font-black tabular-nums text-hg-bright">{displayAptitude(baseAptitude(card, best))}</span>
        </span>
      )}
    </motion.button>
  );
}

export default function RosterPanel({ side, title, cards, hideStats = false, active = false, onInspect }: Props) {
  const text = useHegemonyText();
  const tone = SIDE_TONE[side];
  const empty = Math.max(0, RULES.handSize - cards.length);
  return (
    <aside className={`${PANEL} flex w-full flex-col gap-3 p-3 ${active ? `ring-1 ${side === "player" ? "ring-accent/60" : "ring-hg-enemy/60"}` : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-black ${tone.text}`}>{title}</h3>
        <span className="text-sm font-bold tabular-nums text-text-secondary">{cards.length} / {RULES.handSize}</span>
      </div>
      <div className="space-y-1.5">
        {cards.map((card) => (
          <Slot key={card.id} card={card} hideStats={hideStats} onInspect={onInspect} />
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <div key={i} className="flex h-[54px] items-center justify-center rounded-xl border border-dashed border-hg-line/70 text-sm text-text-tertiary">
            {text.draft.empty}
          </div>
        ))}
      </div>
      <TeamStrength cards={cards} hidden={hideStats} />
    </aside>
  );
}
