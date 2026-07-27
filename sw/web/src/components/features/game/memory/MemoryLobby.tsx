"use client";

import { Brain, Play, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  MEMORY_DIFFICULTIES,
  type MemoryDifficulty,
} from "./types";

interface Props {
  difficulty: MemoryDifficulty;
  availableFigures: number;
  onDifficultyChange: (difficulty: MemoryDifficulty) => void;
  onStart: () => void;
}

export default function MemoryLobby({
  difficulty,
  availableFigures,
  onDifficultyChange,
  onStart,
}: Props) {
  const t = useTranslations("rest.arena.memory");
  const selected = MEMORY_DIFFICULTIES.find((item) => item.key === difficulty)
    ?? MEMORY_DIFFICULTIES[0];
  const canStart = availableFigures >= selected.pairs;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-1 flex-col items-center justify-center py-8 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-bg-main/70 text-accent shadow-[0_0_35px_-10px_rgba(212,175,55,0.75)]">
        <Brain className="h-7 w-7" aria-hidden />
      </div>

      <p className="mb-2 flex items-center gap-2 font-cinzel text-sm font-bold tracking-[0.22em] text-accent">
        <Sparkles className="h-4 w-4" aria-hidden />
        {t("catchphrase")}
      </p>
      <h2 className="font-serif text-4xl font-black text-text-primary sm:text-5xl">
        {t("label")}
      </h2>
      <p className="mt-3 max-w-xl text-base leading-7 text-text-secondary">
        {t("headerSub")}
      </p>

      <fieldset className="mt-9 w-full">
        <legend className="mb-4 font-serif text-lg font-bold text-text-primary">
          {t("selectDifficulty")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {MEMORY_DIFFICULTIES.map((item) => {
            const active = item.key === difficulty;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => onDifficultyChange(item.key)}
                className={[
                  "rounded-xl border p-4 text-start",
                  active
                    ? "border-accent bg-accent/10 text-text-primary"
                    : "border-white/10 bg-bg-main/70 text-text-secondary hover:border-accent/60 hover:bg-white/[0.05] hover:text-text-primary",
                ].join(" ")}
              >
                <span className="block font-serif text-lg font-bold">
                  {t(`difficulty.${item.key}.label`)}
                </span>
                <span className="mt-1 block text-sm leading-6 text-text-secondary">
                  {t(`difficulty.${item.key}.description`, {
                    pairs: item.pairs,
                    cards: item.pairs * 2,
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg border border-accent bg-accent px-7 py-3 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4 fill-current" aria-hidden />
        {t("startGame")}
      </button>

      {canStart ? null : (
        <p className="mt-3 text-sm text-paused">
          {t("notEnoughFigures")}
        </p>
      )}
    </div>
  );
}
