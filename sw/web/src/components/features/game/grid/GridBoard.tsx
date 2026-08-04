"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import {
  GRID_SIZE,
  type GridCell,
  type GridCeleb,
  type GridCondition,
  type GridPuzzle,
} from "./types";
import { PROFESSION_LABELS, NATIONALITY_LABELS, CENTURY_LABELS } from "./fixture";

interface Props {
  puzzle: GridPuzzle;
  cells: GridCell[];
  celebs: GridCeleb[];
  activeCell: { row: number; col: number } | null;
  usedIds: Set<string>;
  onCellSelect: (row: number, col: number) => void;
  onAnswer: (celebId: string) => void;
}

export default function GridBoard({
  puzzle,
  cells,
  celebs,
  activeCell,
  usedIds,
  onCellSelect,
  onAnswer,
}: Props) {
  const t = useTranslations("gameGrid");

  return (
    <div className="m-auto flex w-full max-w-xl flex-col items-center gap-4 px-2 py-4 sm:gap-6 sm:py-8">
      {/* 격자 */}
      <div className="w-full">
        {/* 열 헤더 */}
        <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1 sm:gap-2">
          <div className="w-16 sm:w-24" /> {/* 빈 코너 */}
          {puzzle.colConditions.map((cond, col) => (
            <ConditionLabel key={`col-${col}`} condition={cond} />
          ))}
        </div>

        {/* 행 (헤더 + 셀 3개) */}
        {puzzle.rowConditions.map((rowCond, row) => (
          <div key={`row-${row}`} className="mt-1 grid grid-cols-[auto_repeat(3,1fr)] gap-1 sm:mt-2 sm:gap-2">
            <ConditionLabel condition={rowCond} />
            {Array.from({ length: GRID_SIZE }, (_, col) => {
              const cellIdx = row * GRID_SIZE + col;
              const cell = cells[cellIdx];
              const isActive = activeCell?.row === row && activeCell?.col === col;
              const celeb = cell.answerId
                ? celebs.find((c) => c.id === cell.answerId)
                : null;

              return (
                <button
                  key={`cell-${row}-${col}`}
                  type="button"
                  onClick={() => {
                    if (cell.answerId === null) onCellSelect(row, col);
                  }}
                  disabled={cell.answerId !== null}
                  className={`
                    relative flex aspect-square items-center justify-center rounded-lg border p-1 text-center text-[10px] font-medium leading-tight transition-colors sm:rounded-xl sm:text-xs
                    ${isActive ? "border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-400/40" : ""}
                    ${cell.correct === true ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : ""}
                    ${cell.correct === false ? "border-red-400/60 bg-red-500/15 text-red-200" : ""}
                    ${cell.answerId === null && !isActive ? "border-white/15 bg-white/5 text-text-secondary hover:border-indigo-400/40 hover:bg-indigo-500/10" : ""}
                  `}
                  aria-label={t("cellAriaLabel", { row: row + 1, col: col + 1 })}
                >
                  {cell.correct === true && (
                    <Check className="absolute top-1 right-1 h-3 w-3 text-emerald-400" aria-label={t("correct")} />
                  )}
                  {cell.correct === false && (
                    <X className="absolute top-1 right-1 h-3 w-3 text-red-400" aria-label={t("wrong")} />
                  )}
                  {celeb ? (
                    <span className="line-clamp-2 break-keep">{celeb.nickname}</span>
                  ) : (
                    <span className="text-white/20">?</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 자동완성 입력 */}
      {activeCell && (
        <AutocompleteInput
          celebs={celebs}
          usedIds={usedIds}
          onSelect={onAnswer}
          onCancel={() => onCellSelect(-1, -1)}
        />
      )}

      {/* 진행 표시 */}
      <div className="text-xs text-text-secondary">
        {t("progress", {
          filled: cells.filter((c) => c.answerId !== null).length,
          total: cells.length,
        })}
      </div>
    </div>
  );
}

// ──────────────────── 조건 라벨 ────────────────────

function ConditionLabel({ condition }: { condition: GridCondition }) {
  const locale = useLocale();
  const label = getConditionDisplayLabel(condition, locale);
  return (
    <div className="flex w-16 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-1 py-2 text-center text-[9px] font-bold leading-tight text-text-secondary sm:w-24 sm:rounded-xl sm:px-2 sm:py-3 sm:text-[11px]">
      <span className="line-clamp-2 break-keep">{label}</span>
    </div>
  );
}

function getConditionDisplayLabel(condition: GridCondition, locale: string): string {
  const isEn = locale === "en";
  switch (condition.axis) {
    case "nationality": {
      const nat = NATIONALITY_LABELS[condition.value];
      return (isEn ? nat?.en : nat?.ko) ?? condition.label;
    }
    case "profession": {
      const prof = PROFESSION_LABELS[condition.value];
      return (isEn ? prof?.en : prof?.ko) ?? condition.label;
    }
    case "century": {
      const cen = CENTURY_LABELS[condition.value];
      return (isEn ? cen?.en : cen?.ko) ?? (isEn ? `${condition.value}th century` : `${condition.value}세기`);
    }
    case "tag":
      return isEn ? (condition.labelEn ?? condition.label) : condition.label;
    default:
      return condition.label;
  }
}

// ──────────────────── 자동완성 ────────────────────

function AutocompleteInput({
  celebs,
  usedIds,
  onSelect,
  onCancel,
}: {
  celebs: GridCeleb[];
  usedIds: Set<string>;
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("gameGrid");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 자동 포커스
  const setRef = useCallback((el: HTMLInputElement | null) => {
    if (el) {
      el.focus();
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }
  }, []);

  const filtered = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return celebs
      .filter((c) => !usedIds.has(c.id))
      .filter(
        (c) =>
          c.nickname.toLowerCase().includes(q) ||
          c.nicknameEn.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [celebs, query, usedIds]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
    if (e.key === "Enter" && filtered.length === 1) {
      e.preventDefault();
      onSelect(filtered[0].id);
      setQuery("");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <input
        ref={setRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("searchPlaceholder")}
        className="w-full rounded-lg border border-indigo-400/30 bg-bg-main/80 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
        aria-label={t("searchAriaLabel")}
      />
      {filtered.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-bg-main/95 backdrop-blur-md">
          {filtered.map((celeb) => (
            <li key={celeb.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(celeb.id);
                  setQuery("");
                }}
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-indigo-500/15"
              >
                <span className="font-medium">{celeb.nickname}</span>
                <span className="ml-2 text-[10px] text-text-secondary">
                  {celeb.nicknameEn}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.length >= 1 && filtered.length === 0 && (
        <p className="mt-1 px-1 text-xs text-text-secondary/70">{t("noResults")}</p>
      )}
    </div>
  );
}
