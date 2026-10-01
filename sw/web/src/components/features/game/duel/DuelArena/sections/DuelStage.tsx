/*
  파일명: components/features/game/duel/DuelArena/sections/DuelStage.tsx
  기능: 설전 무대
  책임: 바닥 원 위에 상대(위·끝 쪽)와 나(아래·시작 쪽)를 세우고, 행동에 맞춰 돌진·흔들림과 말풍선을 보인다.
        인물을 누르면 한마디 한다.
*/
"use client";

import type { MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BattleCard, Command } from "@/lib/game/types";
import type { Side } from "@/lib/game/hegemony/types";
import DuelFighter, { type FighterPose } from "../../DuelFighter";
import SpeechBubble from "./SpeechBubble";
import { aiDashVariants, playerDashVariants, poseToDash, shakeVariants } from "./duelHelpers";

interface Props {
  playerCard: BattleCard;
  aiCard: BattleCard;
  command: Command;
  round: number;
  pose: Record<Side, FighterPose>;
  momentum: Record<Side, number>;
  bubble: Record<Side, string>;
  shake: boolean;
  onPoke: (side: Side) => void;
}

// 무대 높이가 낮은 노트북에서도 두 사람과 말풍선이 겹치지 않도록 모든 폭에서 양옆 끝 가까이 둔다.
// 상대는 머리 위 말풍선이 무대 위 끝에 잘리지 않을 만큼 내려 둔다
const SPOT: Record<Side, string> = {
  ai: "end-[5%] top-[10%]",
  player: "bottom-[5%] start-[5%]",
};

export default function DuelStage({ playerCard, aiCard, command, round, pose, momentum, bubble, shake, onPoke }: Props) {
  const fighters = [
    { side: "ai" as const, card: aiCard, dash: aiDashVariants },
    { side: "player" as const, card: playerCard, dash: playerDashVariants },
  ];
  return (
    <motion.div className="relative min-h-0 flex-1 overflow-hidden" variants={shakeVariants} animate={shake ? "shake" : "idle"}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute start-1/2 top-1/2 aspect-2/1 w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-hg-line bg-hg-raised/40"
      />
      {fighters.map(({ side, card, dash }) => (
        <motion.div
          key={side}
          className={`absolute cursor-pointer ${SPOT[side]}`}
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            onPoke(side);
          }}
          variants={dash}
          animate={poseToDash(pose[side])}
        >
          <div className="relative">
            <DuelFighter avatarUrl={card.avatarUrl} nickname={card.nickname} pose={pose[side]} flipped={side === "ai"} momentum={momentum[side]} command={command} />
            <AnimatePresence>
              {bubble[side] && <SpeechBubble key={`${side}-${round}-${bubble[side].slice(0, 6)}`} text={bubble[side]} side={side} />}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
