/*
  파일명: DuelFighter/sections/SlashEffect.tsx
  기능: slash — 검 실루엣 + 찌르기 돌격 이펙트
*/
"use client";

import { motion } from "framer-motion";
import { VB } from "../types";

export function SlashEffect() {
  // 검 실루엣 path: 손잡이→코등이→칼날→칼끝→칼날 하단→코등이 하단→손잡이
  // 좌→우 수평 찌르기. 손잡이 x=35, 칼끝 x=112
  const swordPath = [
    "M 35,63",  // 손잡이 하단
    "L 35,57",  // 손잡이 상단
    "L 42,56",  // 코등이 상단
    "L 42,53",  // 코등이 꼭지
    "L 50,53",  // 코등이→날 연결
    "L 50,55",  // 칼날 상단 시작
    "L 108,58", // 칼날 상단→칼끝 방향 (약간 좁아짐)
    "L 112,60", // 칼끝 (뾰족)
    "L 108,62", // 칼끝→칼날 하단
    "L 50,65",  // 칼날 하단
    "L 50,67",  // 칼날→코등이 연결
    "L 42,67",  // 코등이 하단
    "L 42,64",  // 코등이 하단 꼭지
    "L 35,63",  // 손잡이로 복귀
    "Z",
  ].join(" ");

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB} ${VB}`} fill="none" style={{ transform: "scaleX(-1)" }}>
      <defs>
        <filter id="blade-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="blade-fill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(180,160,120,0.6)" />
          <stop offset="30%" stopColor="rgba(220,220,230,0.85)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,1)" />
        </linearGradient>
      </defs>

      {/* 찌르기 궤적 잔상 — 넓고 옅은 흰색 트레일 */}
      <motion.line
        x1={30} y1={60} x2={112} y2={60}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="14"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />

      {/* 검 본체 — 실루엣 path, 좌→우 스케일 찌르기 */}
      <motion.path
        d={swordPath}
        fill="url(#blade-fill)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.5"
        filter="url(#blade-glow)"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1.05, 1], opacity: [0, 1, 0.85] }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ transformOrigin: "35px 60px" }}
      />

      {/* 칼등 하이라이트 — 날 위쪽 밝은 선 */}
      <motion.line
        x1={50} y1={55.5} x2={106} y2={58.5}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="0.8"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.7, 0.4] }}
        transition={{ duration: 0.12, delay: 0.03, ease: "easeOut" }}
      />

      {/* 칼끝 임팩트 플래시 */}
      <motion.circle
        cx={112} cy={60} r={2}
        fill="rgba(251,191,36,0.9)"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 4, 0], opacity: [1, 0.8, 0] }}
        transition={{ duration: 0.2, delay: 0.12, ease: "easeOut" }}
      />

      {/* 칼끝 스파크 — 전방+상하로 튀는 짧은 불꽃 */}
      {[
        { x2: 122, y2: 60 },
        { x2: 118, y2: 52 },
        { x2: 118, y2: 68 },
      ].map((s, i) => (
        <motion.line
          key={`sk${i}`}
          x1={112} y1={60} x2={s.x2} y2={s.y2}
          stroke={i === 0 ? "rgba(255,255,255,0.9)" : "rgba(251,191,36,0.7)"}
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
