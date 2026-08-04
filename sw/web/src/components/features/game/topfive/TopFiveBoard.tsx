"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, Check, X } from "lucide-react";
import type { TopFivePuzzle, SlotPlacement } from "./types";
import { SLOTS_COUNT } from "./types";

interface Props {
  puzzle: TopFivePuzzle;
  onSubmit: (placements: SlotPlacement[]) => void;
}

export default function TopFiveBoard({ puzzle, onSubmit }: Props) {
  const t = useTranslations("gameTopfive");

  // 슬롯 상태: 각 슬롯에 어떤 후보가 배치됐는지
  const [slots, setSlots] = useState<(string | null)[]>(
    Array(SLOTS_COUNT).fill(null)
  );
  // 현재 선택 중인 슬롯 인덱스
  const [activeSlot, setActiveSlot] = useState<number>(0);

  // 아직 배치되지 않은 후보들
  const availableCandidates = useMemo(
    () => puzzle.candidates.filter((c) => !slots.includes(c.id)),
    [puzzle.candidates, slots]
  );

  // 슬롯에서 후보 제거
  const removeFromSlot = useCallback((slotIndex: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    setActiveSlot(slotIndex);
  }, []);

  // 후보를 현재 활성 슬롯에 배치
  const placeCandidate = useCallback(
    (candidateId: string) => {
      setSlots((prev) => {
        const next = [...prev];
        next[activeSlot] = candidateId;
        return next;
      });
      // 다음 빈 슬롯으로 이동
      setActiveSlot((prev) => {
        const nextSlots = [...slots];
        nextSlots[prev] = candidateId;
        const nextEmpty = nextSlots.findIndex((s, i) => s === null && i !== prev);
        return nextEmpty === -1 ? prev : nextEmpty;
      });
    },
    [activeSlot, slots]
  );

  // 슬롯 간 순서 바꾸기
  const swapSlots = useCallback((indexA: number, indexB: number) => {
    if (indexB < 0 || indexB >= SLOTS_COUNT) return;
    setSlots((prev) => {
      const next = [...prev];
      [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
      return next;
    });
  }, []);

  const allFilled = slots.every((s) => s !== null);

  const handleSubmit = useCallback(() => {
    if (!allFilled) return;
    const placements: SlotPlacement[] = slots.map((candidateId, i) => ({
      slotIndex: i,
      candidateId: candidateId!,
    }));
    onSubmit(placements);
  }, [allFilled, onSubmit, slots]);

  const getCandidateLabel = (id: string) =>
    puzzle.candidates.find((c) => c.id === id)?.label ?? "";

  return (
    <div className="m-auto flex w-full max-w-2xl flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-0 sm:py-6">
      {/* 카테고리 헤더 */}
      <div className="text-center">
        <p className="text-xs font-medium text-amber-300/80 sm:text-sm">
          {t("categoryPrompt")}
        </p>
        <h2 className="mt-1 font-serif text-lg font-bold text-text-primary sm:text-2xl">
          {puzzle.categoryLabel}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          {t("instruction")}
        </p>
      </div>

      {/* 순위 슬롯 영역 */}
      <div className="flex flex-col gap-2">
        {slots.map((candidateId, slotIndex) => (
          <div
            key={slotIndex}
            className={`flex items-center gap-2 rounded-lg border p-2 transition-colors sm:gap-3 sm:p-3 ${
              activeSlot === slotIndex && !candidateId
                ? "border-amber-400/60 bg-amber-500/10"
                : candidateId
                  ? "border-white/20 bg-white/5"
                  : "border-white/10 bg-transparent"
            }`}
            role="listitem"
            aria-label={t("slotAriaLabel", { rank: slotIndex + 1 })}
          >
            {/* 순위 번호 */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-serif text-sm font-bold text-amber-300 sm:h-10 sm:w-10 sm:text-base">
              {slotIndex + 1}
            </div>

            {/* 이름 또는 빈 슬롯 */}
            {candidateId ? (
              <button
                type="button"
                onClick={() => removeFromSlot(slotIndex)}
                className="flex-1 text-left text-sm font-medium text-text-primary hover:text-amber-300 sm:text-base"
                aria-label={t("removeFromSlot", { name: getCandidateLabel(candidateId) })}
              >
                {getCandidateLabel(candidateId)}
                <X className="ml-2 inline-block h-3.5 w-3.5 text-text-secondary" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSlot(slotIndex)}
                className="flex-1 text-left text-xs italic text-text-secondary sm:text-sm"
              >
                {activeSlot === slotIndex ? t("selectHere") : t("emptySlot")}
              </button>
            )}

            {/* 순서 이동 버튼 */}
            {candidateId && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => swapSlots(slotIndex, slotIndex - 1)}
                  disabled={slotIndex === 0}
                  className="rounded p-1 text-text-secondary hover:bg-white/10 hover:text-text-primary disabled:opacity-30"
                  aria-label={t("moveUp")}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => swapSlots(slotIndex, slotIndex + 1)}
                  disabled={slotIndex === SLOTS_COUNT - 1}
                  className="rounded p-1 text-text-secondary hover:bg-white/10 hover:text-text-primary disabled:opacity-30"
                  aria-label={t("moveDown")}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 후보 목록 */}
      <div>
        <p className="mb-2 text-xs font-medium text-text-secondary sm:text-sm">
          {t("candidatesLabel")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {availableCandidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => placeCandidate(candidate.id)}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-left text-xs font-medium text-text-primary hover:border-amber-400/50 hover:bg-amber-500/10 hover:text-amber-200 active:scale-[0.97] sm:text-sm"
            >
              {candidate.label}
            </button>
          ))}
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="text-center">
        <button
          type="button"
          disabled={!allFilled}
          onClick={handleSubmit}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/20 px-8 py-3 font-serif text-sm font-bold text-amber-300 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.6)] hover:border-amber-400 hover:bg-amber-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-text-secondary disabled:shadow-none"
        >
          <Check className="h-4 w-4" aria-hidden />
          {t("submit")}
        </button>
        {!allFilled && (
          <p className="mt-2 text-xs text-text-secondary">
            {t("fillAllSlots")}
          </p>
        )}
      </div>
    </div>
  );
}
