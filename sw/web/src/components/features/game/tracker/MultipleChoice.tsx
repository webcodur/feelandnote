/*
  파일명: components/features/game/tracker/MultipleChoice.tsx
  기능: Stage 4 - 4지선다 객관식
  책임: ArenaCard 4장으로 객관식 선택
*/
"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { TrackerOption } from "@/actions/game/getTrackerRound";
import ArenaCard from "../ArenaCard";

interface MultipleChoiceProps {
  options: TrackerOption[];
  correctId: string;
  onSelect: (selectedId: string) => void;
}

export default function MultipleChoice({
  options,
  correctId,
  onSelect,
}: MultipleChoiceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleClick = (id: string) => {
    if (confirmed) return;
    setSelectedId(id);
  };

  const handleConfirm = () => {
    if (!selectedId || confirmed) return;
    setConfirmed(true);

    setTimeout(() => {
      setRevealed(true);
      setTimeout(() => onSelect(selectedId), 800);
    }, 1200);
  };

  const handleReset = () => {
    if (confirmed) return;
    setSelectedId(null);
  };

  const getStatus = (id: string): "normal" | "win" | "lose" | "selected" => {
    if (!selectedId) return "normal";
    if (!confirmed) return id === selectedId ? "selected" : "normal";
    if (!revealed) return id === selectedId ? "selected" : "normal";
    if (id === correctId) return "win";
    if (id === selectedId) return "lose";
    return "normal";
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 px-2 md:max-w-2xl md:mx-auto">
        {options.map((opt) => (
          <ArenaCard
            key={opt.id}
            imageUrl={opt.avatarUrl}
            name={opt.nickname}
            status={getStatus(opt.id)}
            onClick={!confirmed ? () => handleClick(opt.id) : undefined}
            className="aspect-[2/3]"
          />
        ))}
      </div>

      {/* 확인 / 다시 선택 버튼 */}
      {selectedId && !confirmed && (
        <div className="flex items-center justify-center gap-3 animate-in fade-in">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-tertiary hover:text-text-secondary border border-white/10 hover:border-white/20"
          >
            <RotateCcw size={14} />
            다시 선택
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-accent bg-accent/15 border border-accent/30 hover:bg-accent/25 active:scale-95"
          >
            <Check size={14} />
            확정
          </button>
        </div>
      )}
    </div>
  );
}
