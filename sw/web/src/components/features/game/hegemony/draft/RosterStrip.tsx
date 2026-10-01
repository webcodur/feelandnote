/*
  파일명: components/features/game/hegemony/draft/RosterStrip.tsx
  기능: 좁은 화면용 선발 명단
  책임: 휴대폰에서 한 진영의 명단을 얼굴 다섯 칸 한 줄로 줄여 보여 준다.
*/
"use client";

import { motion } from "framer-motion";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard } from "@/lib/game/types";
import { RULES } from "@/lib/game/hegemony/constants";
import type { Side } from "@/lib/game/hegemony/types";
import { PANEL, SIDE_TONE } from "../ui/tokens";

export default function RosterStrip({ side, title, cards }: { side: Side; title: string; cards: readonly BattleCard[] }) {
  const tone = SIDE_TONE[side];
  return (
    <div className={`${PANEL} p-2.5`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-black ${tone.text}`}>{title}</span>
        <span className="text-sm font-bold tabular-nums text-text-secondary">{cards.length}/{RULES.handSize}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: RULES.handSize }, (_, i) => {
          const card = cards[i];
          return (
            <div key={card?.id ?? `empty-${i}`} className="aspect-square">
              {card && (
                <motion.div layoutId={`draft-${card.id}`} className={`relative size-full overflow-hidden rounded-lg border ${tone.border} bg-hg-ink`}>
                  {card.avatarUrl && <CelebAvatarImage src={card.avatarUrl} alt={card.nickname} className="object-cover object-top" />}
                </motion.div>
              )}
              {!card && <div className="size-full rounded-lg border border-dashed border-hg-line/70" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
