"use client";

import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import { Brain } from "lucide-react";
import {
  MEMORY_RESULT_TIMING,
  showsMemorySuccessEffect,
} from "./audioPlan";
import type { MemoryCardData, MemoryPairResult } from "./types";

interface Props {
  card: MemoryCardData;
  isFlipped: boolean;
  isMatched: boolean;
  pairResult: MemoryPairResult;
  resultEffectActive: boolean;
  backLabel: string;
  onSelect: (card: MemoryCardData) => void;
}

export default function MemoryCard({
  card,
  isFlipped,
  isMatched,
  pairResult,
  resultEffectActive,
  backLabel,
  onSelect,
}: Props) {
  const revealed = isFlipped || isMatched;
  const showsSuccessEffect = showsMemorySuccessEffect(
    pairResult,
    resultEffectActive,
    isMatched,
  );
  return (
    <button
      type="button"
      disabled={isMatched}
      aria-label={revealed ? card.figure.name : backLabel}
      aria-hidden={isMatched}
      data-result-stage={
        pairResult === null
          ? undefined
          : resultEffectActive
            ? "effect"
            : "immediate"
      }
      onClick={() => onSelect(card)}
      className={[
        "group @container relative aspect-[4/5] min-w-0 rounded-lg border bg-bg-card text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        pairResult === "match"
          ? "border-emerald-400 ring-2 ring-emerald-400/70"
          : pairResult === "mismatch"
            ? "border-red-400 ring-2 ring-red-400/70"
            : isFlipped
              ? "border-accent shadow-[0_0_22px_-8px_rgba(212,175,55,0.8)]"
          : "border-accent/20 hover:border-accent/70 hover:bg-white/[0.04]",
        isMatched
          ? "invisible pointer-events-none"
          : "",
      ].join(" ")}
    >
      <span className="absolute inset-0 block overflow-hidden rounded-[7px]">
        <span className={`absolute inset-0 flex ${revealed ? "invisible" : "visible"}`}>
          <span className="m-1.5 flex flex-1 items-center justify-center rounded-md border border-accent/15 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.11),transparent_58%)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 text-accent">
              <Brain className="h-4 w-4" aria-hidden />
            </span>
          </span>
        </span>

        <span
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-[7px] bg-stone-heavy transition-transform ease-out motion-reduce:transform-none motion-reduce:transition-none ${
            revealed ? "visible" : "invisible"
          } ${
            showsSuccessEffect
              ? "translate-y-1"
              : "translate-y-0"
          }`}
          style={{ transitionDuration: `${MEMORY_RESULT_TIMING.effectTransitionMs}ms` }}
        >
          <span className="relative min-h-0 flex-1">
            <CelebAvatarImage
              src={card.figure.avatarUrl}
              alt=""
              className="object-cover"
              style={{ filter: "none" }}
            />
          </span>
          {/* 이름은 얼굴을 가리지 않게 카드 하단에 별도 칸으로 둔다. 좁거나 낮은 화면은 보드의 이름 자리가 대신 읽는다 */}
          <span className="hidden shrink-0 items-center justify-center border-t border-white/10 bg-bg-main/80 px-1 py-0.5 landscape:[@media(min-height:600px)]:flex">
            <span className="block truncate text-center font-serif text-xs font-bold text-text-primary @min-[7rem]:text-sm">
              {card.figure.name}
            </span>
          </span>
          <span
            className={`pointer-events-none absolute inset-0 bg-bg-main/60 transition-opacity ease-out motion-reduce:transition-none ${
              showsSuccessEffect
                ? "opacity-100"
                : "opacity-0"
            }`}
            style={{ transitionDuration: `${MEMORY_RESULT_TIMING.effectTransitionMs}ms` }}
          />
        </span>
      </span>
    </button>
  );
}
