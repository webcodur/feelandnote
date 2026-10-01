/*
  파일명: components/features/game/myth/shared/HudBar.tsx
  기능: 신화 게임 판 위 상태줄
  책임: 남은 시간·점수·기회 같은 판의 숫자를 칸마다 작은 이름표와 큰 숫자로 세운 돌판에 올린다.
        값이 바뀌면 숫자가 한 번 튀어 오르고(pulse), 막대(progress)를 주면 아래에 줄어드는 금빛 줄을 붙인다.
        오른쪽 끝(aside)에는 그만두기 같은 버튼을 둘 수 있다.
*/ // ------------------------------
"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useCalm } from "./motion";

export type HudTone = "plain" | "gold" | "danger" | "good";

const VALUE_TONE: Record<HudTone, string> = {
  plain: "text-text-primary",
  gold: "text-accent",
  danger: "text-status-paused",
  good: "text-status-watching",
};

export interface HudItem {
  key: string;
  label: string;
  value: ReactNode;
  tone?: HudTone;
  // 이 값이 바뀔 때마다 숫자가 튀어 오른다. 0.1초마다 바뀌는 시계에는 주지 않는다
  pulse?: string | number;
}

interface Props {
  items: HudItem[];
  // 0~1. 주면 아래에 줄어드는 막대를 붙인다
  progress?: number | null;
  danger?: boolean;
  aside?: ReactNode;
  className?: string;
}

const BAR_GOLD = "bg-linear-to-r from-accent-dim via-accent to-accent-hover shadow-[0_0_14px_rgba(var(--color-accent-rgb),0.7)]";
const BAR_DANGER = "bg-status-paused shadow-[0_0_14px_var(--color-status-paused)]";

export default function HudBar({ items, progress = null, danger = false, aside, className = "" }: Props) {
  const calm = useCalm();
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl border border-border bg-bg-card/85 shadow-xl backdrop-blur-md ${className}`}>
      <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-accent/60 to-transparent" />
      <div className="flex items-stretch">
        {items.map((item, index) => (
          <div key={item.key} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-center sm:px-4 sm:py-2.5 ${index > 0 ? "border-s border-border" : ""}`}>
            <span className="max-w-full truncate text-sm font-semibold text-text-secondary">{item.label}</span>
            <motion.span
              key={item.pulse === undefined ? "still" : String(item.pulse)}
              initial={item.pulse === undefined || calm ? false : { scale: 1.35, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 20 }}
              className={`max-w-full truncate text-2xl font-black leading-none tracking-tight tabular-nums sm:text-3xl ${VALUE_TONE[item.tone ?? "plain"]}`}
            >
              {item.value}
            </motion.span>
          </div>
        ))}
        {aside && <div className="flex shrink-0 items-center border-s border-border px-2 sm:px-3">{aside}</div>}
      </div>
      {progress !== null && (
        <div className="h-1.5 w-full bg-bg-stone-light" aria-hidden>
          <div className={`h-full rounded-e-full ${danger ? BAR_DANGER : BAR_GOLD}`} style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
