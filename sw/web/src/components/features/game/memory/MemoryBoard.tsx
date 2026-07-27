"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import MemoryCard from "./MemoryCard";
import type {
  MemoryCardData,
  MemoryDifficulty,
} from "./types";

interface Props {
  board: MemoryCardData[];
  difficulty: MemoryDifficulty;
  gridClassName: string;
  openIds: string[];
  matchedIds: Set<string>;
  moves: number;
  elapsedSeconds: number;
  remainingPairs: number;
  progress: number;
  locked: boolean;
  feedback: string;
  onSelect: (card: MemoryCardData) => void;
  onRestart: () => void;
}

export default function MemoryBoard({
  board,
  difficulty,
  gridClassName,
  openIds,
  matchedIds,
  moves,
  elapsedSeconds,
  remainingPairs,
  progress,
  locked,
  feedback,
  onSelect,
  onRestart,
}: Props) {
  const t = useTranslations("rest.arena.memory");

  return (
    <div className="mx-auto flex w-full flex-1 flex-col items-center py-2">
      <div className="mb-3 flex w-full max-w-4xl items-center justify-between gap-3">
        <div>
          <p className="font-cinzel text-sm font-bold tracking-[0.16em] text-accent">
            {t(`difficulty.${difficulty}.label`)}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {t("remaining", { pairs: remainingPairs })}
          </p>
        </div>
        <div className="flex items-center gap-4 text-center">
          <div>
            <span className="block text-sm text-text-secondary">{t("moves")}</span>
            <strong className="font-cinzel text-lg text-text-primary">{moves}</strong>
          </div>
          <div>
            <span className="block text-sm text-text-secondary">{t("time")}</span>
            <strong className="font-cinzel text-lg text-text-primary">
              {t("seconds", { seconds: elapsedSeconds })}
            </strong>
          </div>
          <button
            type="button"
            onClick={onRestart}
            aria-label={t("restart")}
            title={t("restart")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-bg-main/70 text-text-secondary hover:border-accent/60 hover:bg-white/[0.08] hover:text-accent"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mb-4 h-1.5 w-full max-w-4xl overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={`grid w-full flex-1 content-center gap-1.5 sm:gap-2.5 ${gridClassName}`}>
        {board.map((card) => (
          <MemoryCard
            key={card.instanceId}
            card={card}
            isFlipped={openIds.includes(card.instanceId)}
            isMatched={matchedIds.has(card.instanceId)}
            isLocked={locked}
            backLabel={t("cardBack")}
            onSelect={onSelect}
          />
        ))}
      </div>

      <p className="mt-3 min-h-6 text-center font-serif text-sm font-bold text-accent" aria-live="polite">
        {feedback}
      </p>
    </div>
  );
}
