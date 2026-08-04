"use client";

import { Trophy, RotateCcw, Home } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  correctCount: number;
  totalCells: number;
  onReplay: () => void;
  onLobby: () => void;
}

export default function GridResult({ correctCount, totalCells, onReplay, onLobby }: Props) {
  const t = useTranslations("gameGrid");
  const percentage = Math.round((correctCount / totalCells) * 100);
  const isPerfect = correctCount === totalCells;

  return (
    <div className="m-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-8 text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full border ${
          isPerfect
            ? "border-amber-400/50 bg-amber-500/15 text-amber-300"
            : "border-indigo-400/40 bg-indigo-500/15 text-indigo-300"
        }`}
      >
        <Trophy className="h-7 w-7" aria-hidden />
      </div>

      <h2 className="font-serif text-2xl font-black text-text-primary sm:text-3xl">
        {isPerfect ? t("resultPerfect") : t("resultTitle")}
      </h2>

      <p className="text-base text-text-secondary">
        {t("resultScore", { correct: correctCount, total: totalCells })}
      </p>

      {/* 시각적 점수 바 */}
      <div className="w-full max-w-xs">
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isPerfect ? "bg-amber-400" : "bg-indigo-400"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-text-secondary">{percentage}%</p>
      </div>

      {/* 버튼 */}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/45 bg-indigo-500/15 px-5 py-2.5 text-sm font-bold text-indigo-300 hover:border-indigo-400 hover:bg-indigo-500/25 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {t("replay")}
        </button>
        <button
          type="button"
          onClick={onLobby}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-text-secondary hover:border-white/30 hover:bg-white/10 active:scale-[0.98]"
        >
          <Home className="h-4 w-4" aria-hidden />
          {t("toLobby")}
        </button>
      </div>
    </div>
  );
}
