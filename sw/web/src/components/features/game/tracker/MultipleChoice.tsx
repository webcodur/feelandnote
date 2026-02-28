/*
  파일명: components/features/game/tracker/MultipleChoice.tsx
  기능: 6지선다 — 카드 클릭 시 지목(O) / 배제(X) 선택 모달 표시 및 외부 영역 클릭 시 닫힘 기능 포함
*/
"use client";

import { useState, useEffect } from "react";
import { Check, ShieldOff } from "lucide-react";
import type { TrackerOption } from "@/actions/game/getTrackerRound";
import TrackerCard from "./TrackerCard";

interface MultipleChoiceProps {
  options: TrackerOption[];
  correctId: string;
  eliminatedIds: string[];
  canEliminate: boolean;
  onSelect: (selectedId: string) => void;
  onEliminate: (id: string) => void;
  onCardClick?: (id: string) => void;
}

export default function MultipleChoice({
  options,
  correctId,
  eliminatedIds,
  canEliminate,
  onSelect,
  onEliminate,
  onCardClick,
}: MultipleChoiceProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actioning, setActioning] = useState<{ id: string; type: "select" | "eliminate" } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // 외부 영역 클릭 시 닫기
  useEffect(() => {
    if (!pendingId || confirmed) return;

    const handleDocumentClick = () => {
      setPendingId(null);
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [pendingId, confirmed]);

  const handleCardClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // document click으로 전파되지 않도록 방지
    if (confirmed || eliminatedIds.includes(id) || actioning) return;
    setPendingId(id);
    onCardClick?.(id);
  };

  const handleAction = (id: string, type: "select" | "eliminate", e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === "eliminate") {
      setPendingId(null);
      onEliminate(id);
      return;
    }
    // 지목 확정
    setActioning({ id, type });
    setPendingId(null);
    setConfirmed(true);
    setTimeout(() => {
      setRevealed(true);
      setTimeout(() => onSelect(id), 800);
    }, 1200);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingId(null);
  };

  const getStatus = (id: string): "normal" | "win" | "lose" | "selected" | "eliminated" => {
    if (eliminatedIds.includes(id)) return "eliminated";
    if (!confirmed) return pendingId === id ? "selected" : "normal";
    if (!revealed) return actioning?.id === id ? "selected" : "normal";
    if (id === correctId) return "win";
    if (id === actioning?.id) return "lose";
    return "normal";
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 px-2 max-w-2xl mx-auto">
      {options.map((opt) => {
        const isPending = pendingId === opt.id && !confirmed;

        return (
          <div key={opt.id} className="relative">
            <TrackerCard
              imageUrl={opt.avatarUrl}
              name={opt.nickname}
              status={getStatus(opt.id)}
              onClick={!confirmed ? (e) => handleCardClick(opt.id, e) : undefined}
            />

            {/* 카드 위 O/X 선택 오버레이 */}
            {isPending && (
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/80 animate-in fade-in zoom-in-95 duration-150 z-40 cursor-pointer"
                onClick={handleCancel}
              >
                <div className="flex items-center gap-3">
                  {/* 지목(O) 버튼 */}
                  <button
                    onClick={(e) => handleAction(opt.id, "select", e)}
                    className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-accent/40 bg-[#1a1710] text-accent hover:bg-[#231f15] active:scale-90 transition-all shadow-lg"
                  >
                    <Check size={20} strokeWidth={3} />
                  </button>

                  {/* 배제(X) 버튼 */}
                  {canEliminate && (
                    <button
                      onClick={(e) => handleAction(opt.id, "eliminate", e)}
                      className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-red-500/40 bg-[#1a0a0a] text-red-400 hover:bg-red-900/50 active:scale-90 transition-all shadow-lg"
                    >
                      <ShieldOff size={20} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* 지목 확정 중(actioning) 상태일 때 기존의 오버레이 유지 */}
            {actioning?.id === opt.id && !revealed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/70 animate-in fade-in duration-150 z-40 pointer-events-none">
                <p className="text-[11px] sm:text-xs font-serif text-white text-center px-2 leading-tight">
                  용의자 대조 중...
                </p>
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-accent/40 bg-[#1a1710] text-accent">
                  <Check size={14} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
