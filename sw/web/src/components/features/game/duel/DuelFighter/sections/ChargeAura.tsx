/*
  파일명: DuelFighter/sections/ChargeAura.tsx
  기능: charge — 기세를 모으는 오라
  책임: 여덟 방향 집중선이 가운데로 모이고, 기세 수만큼 에너지 고리가 맥동한다.
*/
"use client";

import { motion } from "framer-motion";
import { CX, CY, VB } from "../types";

export function ChargeAura({ momentum }: { momentum: number }) {
  const rings = Math.min(Math.max(momentum, 1), 5);
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB} ${VB}`} fill="none">
      {/* 바깥에서 가운데로 모이는 집중선 */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = i * 45 * (Math.PI / 180);
        return (
          <motion.line
            key={`cl${i}`}
            x1={CX + Math.cos(angle) * 56}
            y1={CY + Math.sin(angle) * 56}
            x2={CX + Math.cos(angle) * 26}
            y2={CY + Math.sin(angle) * 26}
            stroke="rgba(251,191,36,0.6)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="4 3"
            initial={{ strokeDashoffset: 0, opacity: 0.3 }}
            animate={{ strokeDashoffset: -14, opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.5, delay: i * 0.03, repeat: Infinity, repeatDelay: 0.4, ease: "linear" }}
          />
        );
      })}

      {/* 기세 수만큼 맥동하는 에너지 고리 */}
      {Array.from({ length: rings }, (_, i) => (
        <motion.circle
          key={`er${i}`}
          cx={CX}
          cy={CY}
          r={30 + i * 5}
          stroke={`rgba(251,191,36,${0.35 - i * 0.05})`}
          strokeWidth="0.8"
          fill="none"
          initial={{ scale: 0.85, opacity: 0.2 }}
          animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}

      <motion.circle
        cx={CX}
        cy={CY}
        r={24}
        fill="rgba(251,191,36,0.04)"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}
