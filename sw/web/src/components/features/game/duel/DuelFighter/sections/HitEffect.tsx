/*
  파일명: DuelFighter/sections/HitEffect.tsx
  기능: hit — 피격 충격파 + 균열 이펙트
*/
"use client";

import { motion } from "framer-motion";
import { VB, CX, CY } from "../types";

export function HitEffect() {
  const hx = CX;
  const hy = CY;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB} ${VB}`} fill="none">
      {/* 중심 빨간 플래시 — 번쩍 후 사라짐 */}
      <motion.circle
        cx={hx} cy={hy} r={18}
        fill="rgba(239,68,68,0.5)"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 1.2, 0], opacity: [1, 0.8, 0] }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />

      {/* 충격 링 — 중심에서 바깥으로 퍼지는 빨간 원 */}
      <motion.circle
        cx={hx} cy={hy} r={10}
        stroke="rgba(239,68,68,0.7)"
        strokeWidth="2.5"
        fill="none"
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 2.8, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
      <motion.circle
        cx={hx} cy={hy} r={8}
        stroke="rgba(251,146,36,0.5)"
        strokeWidth="1.5"
        fill="none"
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.3, delay: 0.04, ease: "easeOut" }}
      />

      {/* 균열선 — 중심에서 방사형으로 갈라지는 불규칙 선 */}
      {[
        { x2: 28, y2: 38 },
        { x2: 85, y2: 35 },
        { x2: 38, y2: 82 },
        { x2: 82, y2: 78 },
        { x2: 30, y2: 58 },
      ].map((c, i) => (
        <motion.line
          key={`cr${i}`}
          x1={hx} y1={hy}
          x2={c.x2} y2={c.y2}
          stroke="rgba(239,68,68,0.8)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1], opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.25, delay: 0.03 + i * 0.02, ease: "easeOut" }}
        />
      ))}

      {/* 파편 — 작은 빨간 조각들이 튀어나감 */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60 + 15) * (Math.PI / 180);
        const dist = 18 + (i % 3) * 5;
        return (
          <motion.rect
            key={`db${i}`}
            x={hx - 1.5} y={hy - 1.5}
            width={3} height={3}
            rx={0.5}
            fill={i % 2 === 0 ? "rgba(239,68,68,0.9)" : "rgba(251,146,36,0.8)"}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: 0,
              rotate: 180 + i * 30,
            }}
            transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
}
