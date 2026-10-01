/*
  파일명: DuelFighter/sections/GuardEffect.tsx
  기능: guard — 방패 이펙트
  책임: 뾰족한 방패가 튀어나오고, 충격을 흡수하는 파동이 두 번 퍼진 뒤 테두리가 은은하게 맥동한다.
*/
"use client";

import { motion } from "framer-motion";
import { CX, VB } from "../types";

const SHIELD = "M60 18 L80 35 L80 72 Q80 82 60 88 Q40 82 40 72 L40 35 Z";

export function GuardEffect() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB} ${VB}`} fill="none">
      <defs>
        <filter id="guard-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(96,165,250,0.6)" />
        </filter>
      </defs>

      <motion.path
        d={SHIELD}
        stroke="rgba(96,165,250,0.85)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="rgba(96,165,250,0.06)"
        filter="url(#guard-glow)"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18, type: "spring", stiffness: 350, damping: 18 }}
      />

      {/* 방패 안 가로 줄 세 개 */}
      {[44, 55, 66].map((y, i) => (
        <motion.line
          key={`rib${i}`}
          x1={44}
          y1={y}
          x2={76}
          y2={y}
          stroke="rgba(96,165,250,0.25)"
          strokeWidth="1"
          strokeLinecap="round"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 0.25, pathLength: 1 }}
          transition={{ duration: 0.15, delay: 0.2 + i * 0.03 }}
        />
      ))}

      {/* 충격을 흡수하는 파동 */}
      {[0, 0.15].map((delay, i) => (
        <motion.ellipse
          key={`gw${i}`}
          cx={CX}
          cy={55}
          rx={22}
          ry={35}
          stroke="rgba(96,165,250,0.3)"
          strokeWidth="0.8"
          fill="none"
          initial={{ scale: 0.8, opacity: 0.4 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.45, delay: 0.15 + delay, ease: "easeOut" }}
        />
      ))}

      <motion.path
        d={SHIELD}
        stroke="rgba(96,165,250,0.4)"
        strokeWidth="1"
        fill="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}
