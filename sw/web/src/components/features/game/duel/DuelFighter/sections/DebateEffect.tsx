/*
  파일명: DuelFighter/sections/DebateEffect.tsx
  기능: 책략 slash — 말풍선 논파 이펙트
*/
"use client";

import { motion } from "framer-motion";
import { VB } from "../types";

export function DebateEffect() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB} ${VB}`} fill="none" style={{ transform: "scaleX(-1)" }}>
      <defs>
        <filter id="debate-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 논쟁 파동 — 좌→우 확산 잔상 */}
      <motion.line
        x1={30} y1={60} x2={112} y2={60}
        stroke="rgba(212,175,55,0.2)"
        strokeWidth="16"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.4, 0] }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />

      {/* 메인 말풍선 */}
      <motion.path
        d="M 48,32 Q 48,18 70,18 Q 92,18 92,32 Q 92,46 76,46 L 70,58 L 66,46 Q 48,46 48,32 Z"
        fill="rgba(212,175,55,0.12)"
        stroke="rgba(212,175,55,0.7)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        filter="url(#debate-glow)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.15, 1], opacity: [0, 1, 0.8] }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ transformOrigin: "70px 35px" }}
      />

      {/* 느낌표 — 논파 임팩트 */}
      <motion.text
        x={70} y={40}
        fill="rgba(212,175,55,0.95)"
        fontSize="18"
        fontWeight="bold"
        textAnchor="middle"
        fontFamily="var(--font-pretendard)"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0.85], scale: [0.5, 1.3, 1] }}
        transition={{ duration: 0.15, delay: 0.08 }}
      >
        !!
      </motion.text>

      {/* 보조 말풍선 (작은 원) */}
      <motion.circle
        cx={96} cy={28} r={5}
        fill="rgba(212,175,55,0.08)"
        stroke="rgba(212,175,55,0.4)"
        strokeWidth="1"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 0.7, 0.5] }}
        transition={{ duration: 0.15, delay: 0.12 }}
      />
      <motion.circle
        cx={102} cy={20} r={3}
        fill="rgba(212,175,55,0.06)"
        stroke="rgba(212,175,55,0.3)"
        strokeWidth="0.8"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1, 0.8], opacity: [0, 0.5, 0.3] }}
        transition={{ duration: 0.12, delay: 0.16 }}
      />

      {/* 중심 플래시 */}
      <motion.circle
        cx={70} cy={35} r={3}
        fill="rgba(212,175,55,0.8)"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 3.5, 0], opacity: [1, 0.6, 0] }}
        transition={{ duration: 0.2, delay: 0.1, ease: "easeOut" }}
      />

      {/* 논쟁 파편 — 작은 금색 조각 */}
      {[
        { x2: 100, y2: 22 },
        { x2: 105, y2: 40 },
        { x2: 95, y2: 52 },
      ].map((s, i) => (
        <motion.line
          key={`dk${i}`}
          x1={70} y1={35} x2={s.x2} y2={s.y2}
          stroke="rgba(212,175,55,0.6)"
          strokeWidth="1.2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.18, delay: 0.12 + i * 0.02, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}
