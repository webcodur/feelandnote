/*
  파일명: DuelFighter/sections/FallenEffect.tsx
  기능: fallen — 쓰러짐 이펙트
  책임: 작은 먼지가 가라앉고, 쓰러진 자리에 납작한 고리가 퍼졌다 사라진다.
*/
"use client";

import { motion } from "framer-motion";
import { VB } from "../types";

const DUST = [
  { x: 35, y: 70, r: 2, delay: 0.3 },
  { x: 45, y: 75, r: 1.5, delay: 0.4 },
  { x: 55, y: 68, r: 2.5, delay: 0.35 },
  { x: 42, y: 80, r: 1.8, delay: 0.45 },
];

export function FallenEffect() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB} ${VB}`} fill="none">
      {DUST.map((p, i) => (
        <motion.circle
          key={`fp${i}`}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill="rgba(255,255,255,0.4)"
          initial={{ opacity: 0.6, y: -10 }}
          animate={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: p.delay, ease: "easeIn" }}
        />
      ))}
      <motion.ellipse
        cx={38}
        cy={85}
        rx={8}
        ry={3}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.8"
        fill="none"
        initial={{ scale: 0.3, opacity: 0.5 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
      />
    </svg>
  );
}
