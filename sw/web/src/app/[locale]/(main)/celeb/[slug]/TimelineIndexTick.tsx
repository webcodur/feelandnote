/* ─────────────────────────────────────────────
 * [celeb 상세] timeline — 연표 번호 전환 애니메이션
 * - 목차 위치: timeline
 * - 데이터: value prop
 * - 함께 보기: JourneyEventCard.tsx
 * ───────────────────────────────────────────── */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface Props {
  value: number;
}

interface TransitionState {
  value: number;
  direction: 1 | -1;
}

export default function TimelineIndexTick({ value }: Props) {
  const [transition, setTransition] = useState<TransitionState>(() => ({
    value,
    direction: 1,
  }));

  if (value !== transition.value) {
    setTransition({
      value,
      direction: value > transition.value ? 1 : -1,
    });
  }

  const dir = transition.direction;

  return (
    <span className="relative inline-block h-[1em] min-w-[2ch] overflow-hidden align-middle text-center tabular-nums">
      <span className="invisible block leading-none">{value}</span>
      <AnimatePresence initial={false} custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          initial={{ y: `${dir * 110}%` }}
          animate={{ y: "0%" }}
          exit={{ y: `${dir * -110}%` }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 text-center leading-none"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
