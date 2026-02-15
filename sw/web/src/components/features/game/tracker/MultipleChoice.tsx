/*
  파일명: components/features/game/tracker/MultipleChoice.tsx
  기능: Stage 4 - 4지선다 객관식
  책임: ArenaCard 4장으로 객관식 선택
*/
"use client";

import { useState } from "react";
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
  const [revealed, setRevealed] = useState(false);

  const handleClick = (id: string) => {
    if (selectedId) return; // 이미 선택됨
    setSelectedId(id);

    // 1.2초 후 결과 공개 → 상위로 전달
    setTimeout(() => {
      setRevealed(true);
      setTimeout(() => onSelect(id), 800);
    }, 1200);
  };

  const getStatus = (id: string): "normal" | "win" | "lose" | "selected" => {
    if (!selectedId) return "normal";
    if (!revealed) return id === selectedId ? "selected" : "normal";
    if (id === correctId) return "win";
    if (id === selectedId) return "lose";
    return "normal";
  };

  return (
    <div className="space-y-6">
      {/* 스테이지 라벨 */}
      <div className="text-center">
        <p className="text-xs text-text-tertiary font-cinzel uppercase tracking-wider">
          Stage 6 — Final Guess
        </p>
        <p className="text-sm text-text-secondary mt-1">4명 중 정답을 고르세요</p>
      </div>

      {/* 4지선다 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 px-2">
        {options.map((opt) => (
          <ArenaCard
            key={opt.id}
            imageUrl={opt.avatarUrl}
            name={opt.nickname}
            status={getStatus(opt.id)}
            onClick={!selectedId ? () => handleClick(opt.id) : undefined}
            className="aspect-square md:aspect-[2/3]"
          />
        ))}
      </div>
    </div>
  );
}
