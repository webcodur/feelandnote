"use client";

import { useTranslations } from "next-intl";
import { Check, X, ArrowRight, RotateCcw } from "lucide-react";
import type { TopFiveResult as TopFiveResultType } from "./types";
import { MAX_SCORE, SCORE_EXACT_POSITION, SCORE_IN_TOP5 } from "./types";

interface Props {
  result: TopFiveResultType;
  categoryLabel: string;
  onReplay: () => void;
  onLobby: () => void;
}

export default function TopFiveResult({ result, categoryLabel, onReplay, onLobby }: Props) {
  const t = useTranslations("gameTopfive");
  const isPerfect = result.score === MAX_SCORE;

  return (
    <div className="m-auto w-full max-w-lg px-3 py-4 text-center sm:px-0 sm:py-8">
      {/* 점수 */}
      <div className="mb-4 sm:mb-6">
        {isPerfect && (
          <p className="mb-2 text-sm font-bold text-amber-300">{t("resultPerfect")}</p>
        )}
        <p className="font-serif text-4xl font-black text-text-primary sm:text-5xl">
          {result.score}
          <span className="text-lg text-text-secondary sm:text-xl">/{MAX_SCORE}</span>
        </p>
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">
          {t("resultSummary", {
            items: result.correctItems,
            exact: result.exactPositions,
          })}
        </p>
      </div>

      {/* 카테고리 */}
      <p className="mb-3 text-xs font-medium text-amber-300/70 sm:text-sm">
        {categoryLabel}
      </p>

      {/* 유저의 배치와 실제 정답 비교 */}
      <div className="mx-auto max-w-sm space-y-2">
        {result.slotResults.map((slot) => (
          <div
            key={slot.slotIndex}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm sm:gap-3 sm:px-4 sm:py-2.5 ${
              slot.isExactPosition
                ? "border-green-400/40 bg-green-500/10"
                : slot.isInTop5
                  ? "border-amber-400/30 bg-amber-500/8"
                  : "border-red-400/20 bg-red-500/5"
            }`}
          >
            {/* 순위 */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-text-secondary">
              {slot.slotIndex + 1}
            </span>

            {/* 이름 */}
            <span className="flex-1 font-medium text-text-primary">
              {slot.candidateLabel}
            </span>

            {/* 판정 아이콘 + 텍스트 */}
            {slot.isExactPosition ? (
              <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t("exact")}
              </span>
            ) : slot.isInTop5 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-300">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                {t("inTop5", { actual: slot.actualRank! })}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-300">
                <X className="h-3.5 w-3.5" aria-hidden />
                {t("notInTop5")}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 실제 정답 */}
      <div className="mt-5 rounded-xl border border-white/10 bg-bg-main/70 p-3 sm:mt-6 sm:p-4">
        <p className="mb-2 text-xs font-bold text-text-secondary">
          {t("correctAnswer")}
        </p>
        <ol className="space-y-1 text-left text-sm">
          {result.correctOrder.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center gap-2 text-text-primary"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">
                {i + 1}
              </span>
              {c.label}
            </li>
          ))}
        </ol>
      </div>

      {/* 배점 범례 */}
      <div className="mx-auto mt-4 max-w-xs text-xs text-text-secondary">
        <p>
          <span className="text-green-400">●</span> {t("scoreLegendExact", { points: SCORE_EXACT_POSITION })}
        </p>
        <p>
          <span className="text-amber-300">●</span> {t("scoreLegendPartial", { points: SCORE_IN_TOP5 })}
        </p>
        <p>
          <span className="text-red-300">●</span> {t("scoreLegendWrong")}
        </p>
      </div>

      {/* 버튼 */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-5 py-2.5 text-sm font-bold text-amber-300 hover:border-amber-400 hover:bg-amber-500/25 active:scale-[0.98]"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {t("replay")}
        </button>
        <button
          type="button"
          onClick={onLobby}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-text-secondary hover:border-white/30 hover:text-text-primary active:scale-[0.98]"
        >
          {t("toLobby")}
        </button>
      </div>
    </div>
  );
}
