/*
  파일명: components/features/game/hegemony/ui/NationBar.tsx
  기능: 국력·민심 막대
  책임: 값이 줄면 막대가 먼저 줄고 뒤따르는 옅은 막대가 깎인 만큼을 잠깐 보여 준다.
        변화량은 최대치(/ 35) 자리에 대신 튀어나와 좁은 화면에서도 줄 폭이 늘지 않는다.
*/
"use client";

import { motion } from "framer-motion";

const FILL = {
  player: "bg-accent",
  enemy: "bg-hg-enemy",
  morale: "bg-hg-morale",
} as const;

interface Props {
  label: string;
  value: number;
  max: number;
  tone: keyof typeof FILL;
  /** 위험 구간 (민심 반란 직전 등) */
  danger?: boolean;
  dangerLabel?: string;
  /** 이번 라운드 변화량 — 바뀔 때마다 튀어나온다 */
  delta?: number | null;
  deltaKey?: string | number;
  /** 적군 막대는 오른쪽에서 채운다 */
  mirrored?: boolean;
  size?: "sm" | "md";
}

export default function NationBar({ label, value, max, tone, danger = false, dangerLabel, delta = null, deltaKey, mirrored = false, size = "md" }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const barHeight = size === "md" ? "h-2.5" : "h-1.5";
  const origin = mirrored ? "end-0" : "start-0";
  const showDelta = delta !== null && delta !== 0;
  const reverse = mirrored ? "flex-row-reverse" : "";

  return (
    <div className="min-w-0">
      <div className={`flex items-center justify-between gap-1.5 whitespace-nowrap ${reverse}`}>
        <span className={`flex min-w-0 items-center gap-1.5 ${reverse}`}>
          <span className="truncate text-sm font-semibold text-text-secondary">{label}</span>
          {danger && dangerLabel && <span className="shrink-0 rounded bg-hg-enemy/20 px-1 text-xs font-bold text-hg-enemy">{dangerLabel}</span>}
        </span>
        <span className="flex shrink-0 items-baseline gap-1 tabular-nums">
          <span className={`font-black leading-none text-hg-bright ${size === "md" ? "text-xl" : "text-sm"}`}>{Math.max(0, value)}</span>
          {showDelta && delta !== null && (
            <motion.span
              key={deltaKey}
              initial={{ opacity: 0, scale: 1.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className={`rounded px-1 text-sm font-black ${delta > 0 ? "bg-hg-govern/15 text-hg-govern" : "bg-hg-enemy/15 text-hg-enemy"}`}
            >
              {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
            </motion.span>
          )}
          {!showDelta && <span className="text-xs text-text-tertiary">/ {max}</span>}
        </span>
      </div>
      <div className={`relative mt-1 overflow-hidden rounded-full bg-hg-line/70 ${barHeight} ${danger ? "ring-1 ring-hg-enemy/70" : ""}`}>
        <motion.div
          className={`absolute inset-y-0 ${origin} bg-hg-bright/35`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.45, duration: 0.7, ease: "easeOut" }}
        />
        <motion.div
          className={`absolute inset-y-0 ${origin} ${FILL[tone]}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
        />
      </div>
    </div>
  );
}
