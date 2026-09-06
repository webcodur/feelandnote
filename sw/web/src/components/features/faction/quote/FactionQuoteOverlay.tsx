/*
  파일명: /components/features/faction/quote/FactionQuoteOverlay.tsx
  기능: 화보 위에 뜨는 인물 대사
  책임: 재생 중인 대사 한 장을 화보 위에 띄우고, 손으로 넘기는 중이면 남은 장을 알린다.
*/ // ------------------------------

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pointer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAPTION_TRANSITION_SEC,
  QUOTE_LONG_PAGE,
  QUOTE_SIZE_LARGE,
  QUOTE_SIZE_SMALL,
  QUOTE_TEXT_CLASS,
  QUOTE_TEXT_STYLE,
} from "./factionQuotePaging";
import type { FactionQuoteStage } from "./useFactionQuoteStage";

interface Props {
  stage: FactionQuoteStage;
  /** 문구는 화면마다 네임스페이스가 달라 밖에서 넣는다 */
  labels: { tapForNextLine: string; tapToCloseQuote: string };
}

export default function FactionQuoteOverlay({ stage, labels }: Props) {
  const { isManual, isLastManualStep, manualStepIndex, steps, visibleQuote, activeCaptionIndex } = stage;
  const tapLabel = isLastManualStep ? labels.tapToCloseQuote : labels.tapForNextLine;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center overflow-hidden px-7 py-16 md:px-14"
    >
      <figure className="relative w-full max-w-[88%] translate-y-3 animate-fade-in text-center md:max-w-[86%] md:translate-y-5">
        <div className="grid min-h-[5.5rem] place-items-center md:min-h-[7rem]">
          {/*
            손으로 넘길 때는 부드러운 전환을 쓰지 않는다 — 누른 즉시 다음 문장이어야 하고,
            전환이 한 번이라도 어긋나면 앞 문장이 그대로 남아 「안 넘어간다」로 보인다.
            발화에 맞춰 저절로 흐르는 쪽만 전환을 얹는다.
          */}
          {isManual ? (
            visibleQuote && (
              <blockquote
                key={manualStepIndex}
                className={cn(
                  QUOTE_TEXT_CLASS,
                  visibleQuote.length > QUOTE_LONG_PAGE ? QUOTE_SIZE_SMALL : QUOTE_SIZE_LARGE,
                  "animate-fade-in"
                )}
                style={QUOTE_TEXT_STYLE}
              >
                {visibleQuote}
              </blockquote>
            )
          ) : (
            <AnimatePresence initial={false}>
              {visibleQuote && (
                <motion.blockquote
                  key={activeCaptionIndex}
                  initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                  transition={{ duration: CAPTION_TRANSITION_SEC, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(QUOTE_TEXT_CLASS, QUOTE_SIZE_LARGE)}
                  style={QUOTE_TEXT_STYLE}
                >
                  {visibleQuote}
                </motion.blockquote>
              )}
            </AnimatePresence>
          )}
        </div>
        {/*
          목소리가 없어 손으로 넘기는 중임을 알린다 — 몇 번째 문장인지와
          눌러서 다음으로 간다는 안내를 함께 둔다. 마지막 문장에서는 닫힌다고 알린다.
        */}
        {isManual && (
          <figcaption className="mt-6 flex items-center justify-center gap-2" title={tapLabel}>
            {/* 눈으로는 손가락 그림만 보이고, 화면 낭독기에는 말로 읽힌다 */}
            <span className="sr-only">{tapLabel}</span>
            <span
              aria-hidden
              className="animate-tap-hint flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.7)] backdrop-blur-sm"
            >
              {isLastManualStep ? <X size={16} aria-hidden /> : <Pointer size={16} aria-hidden />}
            </span>
            {steps.length > 1 && (
              <span
                aria-hidden
                className="text-[11px] font-bold tabular-nums tracking-[0.12em] text-white/75 md:text-xs"
              >
                {manualStepIndex + 1} / {steps.length}
              </span>
            )}
          </figcaption>
        )}
      </figure>
    </div>
  );
}
