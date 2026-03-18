/*
  HP 바, 기세 게이지, 타이머
*/
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MAX_MOMENTUM, DUEL_TIME_LIMIT_PVP } from "@/lib/game/duelEngine";

// ─── HP 바 — 석재 게이지 ───

export function HpBar({ hp, maxHp, side }: { hp: number; maxHp: number; side: "player" | "ai" }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const fill = pct > 50
    ? "bg-gradient-to-r from-[#8a732a] to-[#d4af37]"
    : pct > 25
      ? "bg-gradient-to-r from-[#8a5a2a] to-[#c08030]"
      : "bg-gradient-to-r from-[#6b2020] to-[#a03030]";
  const dir = side === "ai" ? "justify-end" : "justify-start";

  return (
    <div className="flex-1">
      <div className={`h-5 md:h-6 rounded-[3px] overflow-hidden flex ${dir}`}
        style={{
          background: "linear-gradient(to bottom, rgba(8,8,8,0.95), rgba(20,20,20,0.9))",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <motion.div
          className={`h-full rounded-[2px] ${fill}`}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 6px rgba(212,175,55,0.2)" }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── 기세 게이지 — 석판 블록 ───

export function MomentumGauge({ level, side }: { level: number; side: "player" | "ai" }) {
  return (
    <div className={`flex items-center gap-1 ${side === "ai" ? "justify-end" : "justify-start"}`}>
      {Array.from({ length: MAX_MOMENTUM }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-3 md:w-5 md:h-3.5 rounded-[2px] ${
            i < level
              ? "shadow-[0_0_6px_rgba(212,175,55,0.5)]"
              : ""
          }`}
          style={i < level ? {
            backgroundImage: "linear-gradient(to bottom, #f0d060, #d4af37, #8a732a)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 0 6px rgba(212,175,55,0.5)",
          } : {
            background: "linear-gradient(to bottom, rgba(30,30,30,0.6), rgba(15,15,15,0.8))",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
          }}
        />
      ))}
    </div>
  );
}

// ─── 타이머 ───

export function DuelTimer({ active, onTimeout }: { active: boolean; onTimeout: () => void }) {
  const limit = DUEL_TIME_LIMIT_PVP;
  const [timeLeft, setTimeLeft] = useState(limit);
  const cbRef = useRef(onTimeout);
  cbRef.current = onTimeout;

  useEffect(() => {
    if (!active) { setTimeLeft(limit); return; }
    setTimeLeft(limit);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); cbRef.current(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, limit]);

  return (
    <span className={`text-sm font-mono tabular-nums ${timeLeft <= 2 ? "text-[#a03030]" : "text-white/50"}`}>
      {timeLeft}s
    </span>
  );
}
