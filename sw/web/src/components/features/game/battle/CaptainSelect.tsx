/*
  파일명: components/features/game/battle/CaptainSelect.tsx
  기능: 주장 선택 페이즈
  책임: 드래프트 완료 후 5장 중 1장을 주장으로 지정한다.
*/
"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import BattleCard from "./BattleCard";
import type { BattleCard as BattleCardType } from "@/lib/game/types";

interface Props {
  playerHand: BattleCardType[];
  onSelect: (cardId: string) => void;
  onCardInfo: (cardId: string) => void;
  playSfx: (name: string) => void;
}

export default function CaptainSelect({ playerHand, onSelect, onCardInfo, playSfx }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedId) return;
    playSfx("sfx-confirm.mp3");
    onSelect(selectedId);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <Crown className="w-8 h-8 mx-auto text-amber-400" />
        <h2 className="text-xl font-serif font-black text-white">주장 선택</h2>
        <p className="text-xs text-text-secondary max-w-xs">
          주장이 손패에 있으면 아군 전원 적성 +15%.
          주장이 직접 출전하면 본인 적성 ×1.5.
        </p>
      </div>

      {/* 카드 목록 */}
      <div className="flex flex-wrap justify-center gap-3">
        {playerHand.map((card) => (
          <div key={card.id} className="w-[120px]">
            <BattleCard
              card={card}
              selected={selectedId === card.id}
              isCaptain={selectedId === card.id}
              onClick={() => {
                playSfx("sfx-card-select.mp3");
                setSelectedId(card.id);
              }}
              onInfo={() => onCardInfo(card.id)}
            />
          </div>
        ))}
      </div>

      {/* 확인 버튼 */}
      <button
        onClick={handleConfirm}
        disabled={!selectedId}
        className={`
          flex items-center gap-2 px-8 py-3 rounded-lg font-serif font-bold text-sm transition-all
          ${selectedId
            ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 active:scale-95"
            : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
          }
        `}
      >
        <Crown className="w-4 h-4" />
        임명
      </button>
    </div>
  );
}
