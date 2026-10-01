/*
  파일명: components/features/game/myth/shared/RevealBar.tsx
  기능: 신화 게임 공개 막대
  책임: 고른 뒤 맞음·틀림을 표시와 문장으로 알리고 다음으로 넘기는 버튼을 판 아래에 붙인다.
        판이 화면보다 길어도 막대는 화면 아래에 붙어 있어 버튼을 찾으러 내려가지 않고,
        나타날 때 판 끝까지 내려 막대가 정답 칸을 덮지 않게 한다.
*/ // ------------------------------
"use client";

import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CircleCheck, CircleX, Info } from "lucide-react";
import { useCalm } from "./motion";
import { scrollStageEnd } from "./stage";
import { BTN_GOLD, SHINE, STICK_BOTTOM, STICK_FADE } from "./ui";

export type RevealTone = "correct" | "wrong" | "neutral";

const TONE: Record<RevealTone, { frame: string; text: string }> = {
  correct: { frame: "border-status-watching", text: "text-status-watching" },
  wrong: { frame: "border-status-paused", text: "text-status-paused" },
  neutral: { frame: "border-accent-dim", text: "text-accent" },
};

const ICON_SIZE = 22;

interface Props {
  tone: RevealTone;
  title: ReactNode;
  detail?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  // 읽기 도구에 먼저 들려줄 판정(맞음·틀림). 표시가 그림뿐이라 말로 한 번 더 알린다
  toneLabel?: string;
}

export default function RevealBar({ tone, title, detail, actionLabel, onAction, toneLabel }: Props) {
  const calm = useCalm();
  const look = TONE[tone];
  // 판이 화면보다 길면 막대가 판 끝을 덮는다. 나타날 때 판 끝까지 내려 정답 칸과 막대를 함께 보인다
  useEffect(() => {
    scrollStageEnd(!calm);
  }, [calm]);
  return (
    <motion.div
      className={`${STICK_BOTTOM} ${STICK_FADE} z-[5] -mx-3 mt-auto px-2 pt-3 sm:-mx-1 sm:px-0`}
      initial={calm ? { opacity: 0 } : { opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calm ? { duration: 0.15 } : { type: "spring", stiffness: 340, damping: 30 }}
      aria-live="polite"
    >
      <div className={`relative flex flex-col gap-3 overflow-hidden rounded-xl border-2 bg-bg-card/95 p-3.5 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:gap-5 sm:p-4 ${look.frame}`}>
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-r from-accent/10 via-transparent to-transparent" />
        <div className="relative flex min-w-0 flex-1 gap-3">
          <span className={`mt-0.5 shrink-0 ${look.text}`} aria-hidden>
            {tone === "correct" && <CircleCheck size={ICON_SIZE} />}
            {tone === "wrong" && <CircleX size={ICON_SIZE} />}
            {tone === "neutral" && <Info size={ICON_SIZE} />}
          </span>
          <div className="min-w-0">
            <p className={`text-balance break-keep text-base font-bold leading-snug sm:text-lg ${look.text}`}>
              {toneLabel && <span className="sr-only">{toneLabel}. </span>}
              {title}
            </p>
            {detail && <div className="mt-1 text-sm leading-relaxed text-text-primary">{detail}</div>}
          </div>
        </div>
        <button type="button" onClick={onAction} className={`${BTN_GOLD} w-full shrink-0 sm:w-auto`}>
          <span aria-hidden className={SHINE} />
          {actionLabel}
          <ArrowRight size={18} aria-hidden />
        </button>
      </div>
    </motion.div>
  );
}
