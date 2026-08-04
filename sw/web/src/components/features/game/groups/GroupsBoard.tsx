"use client";

/**
 * 넷씩 넷 (Groups) — 보드: 16칸의 인물 격자 + 선택/제출 인터랙션
 */

import { useTranslations } from "next-intl";
import {
  DIFFICULTY_COLORS,
  GROUP_SIZE,
  MAX_MISTAKES,
  type GroupsPuzzle,
  type SolvedGroup,
} from "./types";

interface Props {
  puzzle: GroupsPuzzle;
  selectedIds: string[];
  solvedGroups: SolvedGroup[];
  mistakes: number;
  shakeIds: string[];
  onToggle: (id: string) => void;
  onSubmit: () => void;
  onDeselect: () => void;
}

export default function GroupsBoard({
  puzzle,
  selectedIds,
  solvedGroups,
  mistakes,
  shakeIds,
  onToggle,
  onSubmit,
  onDeselect,
}: Props) {
  const t = useTranslations("gameGroups");

  const solvedGroupIndices = new Set(solvedGroups.map((s) => s.groupIndex));
  const remainingItems = puzzle.items.filter(
    (item) => !solvedGroupIndices.has(item.groupIndex)
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-3">
      {/* 풀린 묶음 표시 */}
      {solvedGroups.map((solved) => {
        const group = puzzle.groups[solved.groupIndex];
        const color = DIFFICULTY_COLORS[solved.groupIndex];
        return (
          <div
            key={solved.groupIndex}
            className="w-full rounded-lg px-4 py-3 text-center"
            style={{ backgroundColor: color, color: "#1a1a1a" }}
          >
            <div className="font-bold text-sm">{group.label}</div>
            <div className="text-xs mt-1 opacity-80">
              {solved.items.map((it) => it.name).join(", ")}
            </div>
          </div>
        );
      })}

      {/* 미풀린 인물 격자 */}
      {remainingItems.length > 0 && (
        <div className="grid grid-cols-4 gap-2 w-full">
          {remainingItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isShaking = shakeIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onToggle(item.id)}
                aria-pressed={isSelected}
                aria-label={item.name}
                className={[
                  "relative rounded-lg px-2 py-3 text-center text-xs font-medium",
                  "min-h-[3.5rem] flex items-center justify-center",
                  "border transition-colors transition-transform",
                  isSelected
                    ? "bg-white/20 border-white/60 text-white scale-[0.96]"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/30",
                  isShaking ? "animate-shake" : "",
                ].join(" ")}
              >
                <span className="leading-tight line-clamp-2">{item.name}</span>
                {isSelected && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 실수 표시 */}
      <div className="flex items-center gap-2 mt-2" role="status" aria-label={t("mistakesLeft")}>
        <span className="text-xs text-white/50">{t("mistakesRemaining")}:</span>
        <div className="flex gap-1">
          {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
            <span
              key={i}
              className={[
                "w-3 h-3 rounded-full",
                i < MAX_MISTAKES - mistakes ? "bg-white/60" : "bg-red-500/60",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      {remainingItems.length > 0 && (
        <div className="flex gap-3 mt-2">
          <button
            onClick={onDeselect}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/70 text-sm
                       hover:border-white/40 hover:text-white
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
          >
            {t("deselect")}
          </button>
          <button
            onClick={onSubmit}
            disabled={selectedIds.length !== GROUP_SIZE}
            className="px-6 py-2 rounded-lg text-sm font-semibold
                       bg-white text-black
                       hover:bg-white/90
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
          >
            {t("submit")}
          </button>
        </div>
      )}
    </div>
  );
}
