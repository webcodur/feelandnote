"use client";

import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  score: number;
  maxScore: number;
  bestScore: number;
  correctCount: number;
  answeredRounds: number;
  skippedCount: number;
  bestStreak: number;
  onReplay: () => void;
  onLobby: () => void;
}

export default function PortraitResult({
  score,
  maxScore,
  bestScore,
  correctCount,
  answeredRounds,
  skippedCount,
  bestStreak,
  onReplay,
  onLobby,
}: Props) {
  const t = useTranslations("rest.arena.portrait");
  const accuracy = answeredRounds === 0 ? 0 : Math.round((correctCount / answeredRounds) * 100);

  return (
    <div className="m-auto w-full max-w-2xl py-4 text-center sm:py-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent sm:h-16 sm:w-16">
        <Trophy className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
      </div>
      <p className="mt-4 font-cinzel text-[9px] font-bold tracking-[0.24em] text-accent/70 sm:mt-5 sm:text-[10px]">COMPLETE</p>
      <h1 className="mt-2 font-serif text-2xl font-black text-text-primary sm:text-3xl">{t("result.title")}</h1>
      <p className="mt-2 text-xs text-text-secondary sm:mt-3 sm:text-sm">{t("result.summary")}</p>

      <div className="mt-5 rounded-2xl border border-accent/20 bg-bg-main/75 p-4 backdrop-blur-sm sm:mt-7 sm:p-5">
        <p className="text-xs text-text-secondary">{t("result.finalScore")}</p>
        <p className="mt-1 font-cinzel text-3xl font-black text-accent sm:text-4xl">{score.toLocaleString()}</p>
        <p className="mt-1 text-[10px] text-text-secondary">/ {maxScore.toLocaleString()}</p>
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4 sm:mt-5">
          <ResultStat label={t("result.correct")} value={`${correctCount}/${answeredRounds}`} />
          <ResultStat label={t("result.accuracy")} value={`${accuracy}%`} />
          <ResultStat label={t("result.bestStreak")} value={String(bestStreak)} />
        </div>
      </div>

      {skippedCount > 0 && (
        <p className="mt-3 text-[11px] text-text-secondary">
          {t("result.skipped", { count: skippedCount })}
        </p>
      )}
      <p className="mt-3 text-xs font-bold text-accent/80 sm:mt-4">
        {t("bestScore", { score: bestScore.toLocaleString() })}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:mt-6 sm:flex-row">
        <button
          type="button"
          onClick={onReplay}
          className="min-h-12 rounded-xl border border-accent/45 bg-accent/15 px-6 py-3 font-serif text-sm font-bold text-accent hover:border-accent hover:bg-accent/25 active:scale-[0.98]"
        >
          {t("result.replay")}
        </button>
        <button
          type="button"
          onClick={onLobby}
          className="min-h-12 rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-serif text-sm font-bold text-text-primary hover:border-white/35 hover:bg-white/10 active:scale-[0.98]"
        >
          {t("result.lobby")}
        </button>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2">
      <p className="font-cinzel text-lg font-black text-text-primary sm:text-xl">{value}</p>
      <p className="mt-1 text-[9px] text-text-secondary sm:text-[10px]">{label}</p>
    </div>
  );
}
