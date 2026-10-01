/*
  파일명: components/features/game/myth/shared/Verdict.tsx
  기능: 신화 게임 맞음·틀림 연출
  책임: 고른 칸 위에 맞음·틀림 표(원 안의 체크·엑스)를 튀어 올리고 테두리 빛이 한 번 퍼지게 한다(Verdict).
        화면 가장자리가 금빛·붉은빛으로 한 번 번쩍이게 한다(ScreenFlash). 색만으로 가르지 않도록 표에 이름을 단다.
        움직임을 줄인 사람에게는 퍼짐 없이 짧게 나타나기만 한다.
*/ // ------------------------------
"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useCalm } from "./motion";

export type VerdictTone = "correct" | "wrong";

const LOOK = {
  correct: { ring: "border-status-watching", badge: "bg-status-watching", Icon: Check },
  wrong: { ring: "border-status-paused", badge: "bg-status-paused", Icon: X },
} as const;

// 맞은 칸·틀린 칸 테두리에 거는 빛. 칸 자체의 즉각 색과 겹쳐 쓴다
export const GLOW = {
  correct: "border-status-watching shadow-[0_0_0_1px_var(--color-status-watching),0_0_36px_-6px_var(--color-status-watching)]",
  wrong: "border-status-paused shadow-[0_0_0_1px_var(--color-status-paused),0_0_36px_-6px_var(--color-status-paused)]",
} as const;

interface Props {
  tone: VerdictTone;
  label: string;
  // 표가 앉을 자리. 기본은 칸의 오른쪽 위
  className?: string;
  burst?: boolean;
}

export default function Verdict({ tone, label, className = "end-2 top-2", burst = true }: Props) {
  const calm = useCalm();
  const look = LOOK[tone];
  return (
    <>
      {burst && !calm && (
        <motion.span
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-[3] rounded-[inherit] border-4 ${look.ring}`}
          initial={{ opacity: 0.95, scale: 1 }}
          animate={{ opacity: 0, scale: 1.16 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        />
      )}
      <motion.span
        role="img"
        aria-label={label}
        className={`pointer-events-none absolute z-[4] flex h-8 w-8 items-center justify-center rounded-full text-bg-main shadow-lg ring-2 ring-bg-main ${look.badge} ${className}`}
        initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.2, rotate: -35 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={calm ? { duration: 0.15 } : { type: "spring", stiffness: 520, damping: 17 }}
      >
        <look.Icon size={18} strokeWidth={3.2} aria-hidden />
      </motion.span>
    </>
  );
}

const EDGE = {
  correct: "bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(var(--color-accent-rgb),0.34)_100%)]",
  wrong: "bg-[radial-gradient(ellipse_at_center,transparent_48%,color-mix(in_srgb,var(--color-status-paused)_42%,transparent)_100%)]",
} as const;

// 화면 가장자리 번쩍임. serial이 바뀔 때마다 한 번 번쩍인다
export function ScreenFlash({ tone, serial }: { tone: VerdictTone | null; serial: number }) {
  const calm = useCalm();
  if (!tone || serial === 0) return null;
  return (
    <motion.div
      key={serial}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[4] ${EDGE[tone]}`}
      initial={{ opacity: calm ? 0.4 : 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: calm ? 0.25 : 0.6, ease: "easeOut" }}
    />
  );
}
