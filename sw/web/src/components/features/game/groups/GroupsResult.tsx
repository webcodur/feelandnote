"use client";

/**
 * 넷씩 넷 (Groups) — 결과 화면
 */

import { useTranslations } from "next-intl";
import { DIFFICULTY_COLORS, type GroupsPuzzle, type SolvedGroup, type GuessResult } from "./types";

interface Props {
  puzzle: GroupsPuzzle;
  solvedGroups: SolvedGroup[];
  mistakes: number;
  won: boolean;
  guessHistory: GuessResult[];
  onReplay: () => void;
}

export default function GroupsResult({
  puzzle,
  solvedGroups,
  mistakes,
  won,
  guessHistory,
  onReplay,
}: Props) {
  const t = useTranslations("gameGroups");

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 text-center max-w-lg mx-auto">
      {/* 승패 메시지 */}
      <h2 className="text-2xl font-bold text-white">
        {won ? t("result.win") : t("result.lose")}
      </h2>
      <p className="text-sm text-white/60">
        {won
          ? t("result.winDetail", { mistakes })
          : t("result.loseDetail")}
      </p>

      {/* 전체 정답 보기 */}
      <div className="w-full flex flex-col gap-2 mt-2">
        {puzzle.groups.map((group, gi) => {
          const items = puzzle.items.filter((it) => it.groupIndex === gi);
          const color = DIFFICULTY_COLORS[gi];
          const isSolved = solvedGroups.some((s) => s.groupIndex === gi);
          return (
            <div
              key={gi}
              className="rounded-lg px-4 py-3 text-center"
              style={{ backgroundColor: color, color: "#1a1a1a" }}
            >
              <div className="font-bold text-sm flex items-center justify-center gap-2">
                {group.label}
                {isSolved && <span aria-label={t("result.solved")}>✓</span>}
              </div>
              <div className="text-xs mt-1 opacity-80">
                {items.map((it) => it.name).join(", ")}
              </div>
            </div>
          );
        })}
      </div>

      {/* 추측 히스토리 (이모지 격자 — 공유용) */}
      <div className="mt-4 bg-white/5 rounded-lg px-4 py-3 w-full">
        <h3 className="text-xs text-white/40 uppercase tracking-widest mb-2">
          {t("result.history")}
        </h3>
        <div className="flex flex-col items-center gap-1">
          {guessHistory.map((guess, i) => (
            <div key={i} className="text-base">
              {guess.correct ? "🟩🟩🟩🟩" : `${"🟩".repeat(guess.matchCount)}${"⬛".repeat(4 - guess.matchCount)}`}
            </div>
          ))}
        </div>
      </div>

      {/* 다시 하기 */}
      <button
        onClick={onReplay}
        className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold
                   bg-white text-black hover:bg-white/90
                   transition-colors"
      >
        {t("result.playAgain")}
      </button>
    </div>
  );
}
