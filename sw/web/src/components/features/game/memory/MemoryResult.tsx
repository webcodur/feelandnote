"use client";

import { RotateCcw, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MemoryDifficulty } from "./types";

interface Props {
  difficulty: MemoryDifficulty;
  moves: number;
  elapsedSeconds: number;
  hasNextDifficulty: boolean;
  onReplay: () => void;
  onNext: () => void;
  onLobby: () => void;
}

export default function MemoryResult({
  difficulty,
  moves,
  elapsedSeconds,
  hasNextDifficulty,
  onReplay,
  onNext,
  onLobby,
}: Props) {
  const t = useTranslations("rest.arena.memory");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col items-center justify-center py-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent shadow-[0_0_45px_-12px_rgba(212,175,55,0.9)]">
        <Trophy className="h-9 w-9" aria-hidden />
      </div>
      <p className="mt-5 font-cinzel text-sm font-bold tracking-[0.2em] text-accent">
        {t(`difficulty.${difficulty}.label`)}
      </p>
      <h2 className="mt-2 font-serif text-3xl font-black text-text-primary sm:text-4xl">
        {t("result.title")}
      </h2>
      <p className="mt-3 text-base text-text-secondary">
        {t("result.summary", { moves, seconds: elapsedSeconds })}
      </p>

      <div className="mt-7 grid w-full grid-cols-2 gap-3 rounded-xl border border-white/10 bg-bg-main/75 p-4">
        <div>
          <span className="block text-sm text-text-secondary">{t("moves")}</span>
          <strong className="mt-1 block font-cinzel text-2xl text-text-primary">{moves}</strong>
        </div>
        <div>
          <span className="block text-sm text-text-secondary">{t("time")}</span>
          <strong className="mt-1 block font-cinzel text-2xl text-text-primary">
            {t("seconds", { seconds: elapsedSeconds })}
          </strong>
        </div>
      </div>

      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-2.5 font-serif font-bold text-text-primary hover:border-accent/60 hover:bg-white/[0.08] hover:text-accent"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {t("result.replay")}
        </button>
        {hasNextDifficulty ? (
          <button
            type="button"
            onClick={onNext}
            className="min-h-11 flex-1 rounded-lg border border-accent bg-accent px-5 py-2.5 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover"
          >
            {t("result.next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onLobby}
            className="min-h-11 flex-1 rounded-lg border border-accent bg-accent px-5 py-2.5 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover"
          >
            {t("result.lobby")}
          </button>
        )}
      </div>
    </div>
  );
}
