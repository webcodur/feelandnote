/*
  파일명: components/features/game/hegemony/HegemonyBackground.tsx
  기능: 패권 배경
  책임: 타이틀은 밤 산정의 황금 신전, 선발·대전은 어두운 고지도 위 전략 탁자, 결과는 승패 색을 입힌 신전으로 바꾼다.
        단계가 바뀌면 겹쳐서 천천히 바뀐다(공간 전환이라 애니메이션 허용).
*/
"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Phase } from "@/lib/game/hegemony/session/types";
import type { GameWinner } from "@/lib/game/hegemony/types";

const KEY_ART = "/images/games/hegemony-card.webp";
const WAR_MAP = "/images/backgrounds/pc-hegemony2.webp";

type Scene = "title" | "table" | "victory" | "defeat";

function sceneOf(phase: Phase, winner: GameWinner | null): Scene {
  if (phase === "result") return winner === "player" ? "victory" : "defeat";
  return phase === "title" || phase === "loading" ? "title" : "table";
}

const SCENES: Record<Scene, { src: string; overlay: string; zoom: boolean }> = {
  title: {
    src: KEY_ART,
    overlay: "bg-linear-to-r from-hg-ink via-hg-ink/70 to-hg-ink/10",
    zoom: true,
  },
  table: {
    src: WAR_MAP,
    overlay: "bg-radial from-hg-ink/40 via-hg-ink/75 to-hg-ink",
    zoom: false,
  },
  victory: {
    src: KEY_ART,
    overlay: "bg-linear-to-t from-hg-ink via-hg-ink/60 to-accent/15",
    zoom: true,
  },
  defeat: {
    src: KEY_ART,
    overlay: "bg-linear-to-t from-hg-ink via-hg-ink/80 to-hg-enemy/20 grayscale",
    zoom: false,
  },
};

interface Props {
  phase: Phase;
  winner: GameWinner | null;
}

export default function HegemonyBackground({ phase, winner }: Props) {
  const scene = sceneOf(phase, winner);
  const look = SCENES[scene];
  return (
    <div className="absolute inset-0 bg-hg-ink">
      <AnimatePresence initial={false}>
        <motion.div
          key={scene}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: look.zoom ? 1.08 : 1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 14, ease: "easeOut" }}
          >
            <Image
              src={look.src}
              alt=""
              fill
              priority={scene === "title"}
              sizes="100vw"
              className={`object-cover ${scene === "title" || scene === "victory" ? "object-[62%_center]" : "object-center"} ${scene === "defeat" ? "grayscale" : ""}`}
            />
          </motion.div>
          <div className={`absolute inset-0 ${look.overlay}`} />
        </motion.div>
      </AnimatePresence>
      {/* 가장자리 어둠 — 가운데 조작 영역을 또렷하게 */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-transparent from-55% to-hg-ink/85" />
    </div>
  );
}
