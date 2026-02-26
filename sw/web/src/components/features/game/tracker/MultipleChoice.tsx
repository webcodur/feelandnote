/*
  파일명: components/features/game/tracker/MultipleChoice.tsx
  기능: 6지선다 — 카드 클릭=정답 확정 모달, X 클릭=배제 확정 모달 (카드 위 오버레이)
*/
"use client";

import { useState } from "react";
import { Check, X, ShieldOff } from "lucide-react";
import type { TrackerOption } from "@/actions/game/getTrackerRound";
import TrackerCard from "./TrackerCard";

interface MultipleChoiceProps {
  options: TrackerOption[];
  correctId: string;
  eliminatedIds: string[];
  canEliminate: boolean;
  onSelect: (selectedId: string) => void;
  onEliminate: (id: string) => void;
}

type PendingAction = { id: string; type: "select" | "eliminate" } | null;

export default function MultipleChoice({
  options,
  correctId,
  eliminatedIds,
  canEliminate,
  onSelect,
  onEliminate,
}: MultipleChoiceProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCardClick = (id: string) => {
    if (confirmed || eliminatedIds.includes(id)) return;
    setPending({ id, type: "select" });
  };

  const handleEliminateClick = (id: string) => {
    if (confirmed || eliminatedIds.includes(id)) return;
    setPending({ id, type: "eliminate" });
  };

  const handleConfirm = () => {
    if (!pending || confirmed) return;
    if (pending.type === "eliminate") {
      onEliminate(pending.id);
      setPending(null);
      return;
    }
    // 정답 선택 확정
    setConfirmed(true);
    setTimeout(() => {
      setRevealed(true);
      setTimeout(() => onSelect(pending.id), 800);
    }, 1200);
  };

  const handleCancel = () => {
    if (confirmed) return;
    setPending(null);
  };

  const getStatus = (id: string): "normal" | "win" | "lose" | "selected" | "eliminated" => {
    if (eliminatedIds.includes(id)) return "eliminated";
    if (!confirmed) return pending?.id === id ? "selected" : "normal";
    if (!revealed) return pending?.id === id ? "selected" : "normal";
    if (id === correctId) return "win";
    if (id === pending?.id) return "lose";
    return "normal";
  };

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 px-1">
      {options.map((opt) => {
        const isPending = pending?.id === opt.id && !confirmed;
        const isEliminated = eliminatedIds.includes(opt.id);

        return (
          <div key={opt.id} className="relative">
            <TrackerCard
              imageUrl={opt.avatarUrl}
              name={opt.nickname}
              status={getStatus(opt.id)}
              onClick={!confirmed && !isPending ? () => handleCardClick(opt.id) : undefined}
              onEliminate={canEliminate && !confirmed && !isEliminated && !isPending ? () => handleEliminateClick(opt.id) : undefined}

            />

            {/* 카드 위 확정 오버레이 */}
            {isPending && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/70 animate-in fade-in duration-150 z-40">
                <p className="text-[11px] sm:text-xs font-serif text-white text-center px-2 leading-tight">
                  {pending.type === "select" ? "정답으로 확정?" : "배제할까요?"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-white/20 bg-[#1a1a1a] text-text-tertiary hover:text-white active:scale-90 transition-all"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border active:scale-90 transition-all ${
                      pending.type === "select"
                        ? "border-accent/40 bg-[#1a1710] text-accent hover:bg-[#231f15]"
                        : "border-red-500/40 bg-[#1a0a0a] text-red-400 hover:bg-red-900/50"
                    }`}
                  >
                    {pending.type === "select" ? <Check size={14} /> : <ShieldOff size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
