/*
  판정 텍스트 이펙트 — 적중 시 동심원 위에 표시
*/
"use client";

import { motion } from "framer-motion";
import type { RhythmJudgment, Lane } from "@/lib/game/rhythmEngine";

export default function HitRing({ lane, type, judgeY }: { lane: Lane; type: RhythmJudgment; judgeY: number }) {
  if (type === "miss") return null;
  const color = type === "perfect" ? "#d4af37" : "#c0c0c0";
  return (
    <motion.div
      className="absolute left-1/2 pointer-events-none text-center"
      style={{
        top: judgeY - 50,
        transform: "translateX(-50%)",
      }}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 0, y: -20 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="text-base font-cinzel font-bold tracking-wider"
        style={{ color, textShadow: `0 0 12px ${color}80` }}
      >
        {type === "perfect" ? "PERFECT" : "GOOD"}
      </span>
    </motion.div>
  );
}
