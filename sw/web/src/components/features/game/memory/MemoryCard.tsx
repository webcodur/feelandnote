"use client";

import Image from "next/image";
import { Brain } from "lucide-react";
import type { MemoryCardData } from "./types";

interface Props {
  card: MemoryCardData;
  isFlipped: boolean;
  isMatched: boolean;
  isLocked: boolean;
  backLabel: string;
  onSelect: (card: MemoryCardData) => void;
}

export default function MemoryCard({
  card,
  isFlipped,
  isMatched,
  isLocked,
  backLabel,
  onSelect,
}: Props) {
  const revealed = isFlipped || isMatched;

  return (
    <button
      type="button"
      disabled={isMatched || isLocked}
      aria-label={revealed ? card.figure.name : backLabel}
      aria-hidden={isMatched}
      onClick={() => onSelect(card)}
      className={[
        "group relative aspect-[4/5] min-w-0 rounded-lg border bg-bg-card text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isFlipped
          ? "border-accent shadow-[0_0_22px_-8px_rgba(212,175,55,0.8)]"
          : "border-accent/20 hover:border-accent/70 hover:bg-white/[0.04]",
        isMatched
          ? "invisible pointer-events-none"
          : "",
      ].join(" ")}
    >
      <span className="absolute inset-0 block">
        <span className={`absolute inset-0 flex ${revealed ? "invisible" : "visible"}`}>
          <span className="m-1.5 flex flex-1 items-center justify-center rounded-md border border-accent/15 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.11),transparent_58%)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 text-accent">
              <Brain className="h-4 w-4" aria-hidden />
            </span>
          </span>
        </span>

        <span className={`absolute inset-0 overflow-hidden rounded-[7px] bg-stone-heavy ${revealed ? "visible" : "invisible"}`}>
          <Image
            src={card.figure.avatarUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 20vw, 140px"
            className="object-cover"
          />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-main via-bg-main/90 to-transparent px-1.5 pb-1.5 pt-6">
            <span className="block truncate text-center font-serif text-sm font-bold text-text-primary">
              {card.figure.name}
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
