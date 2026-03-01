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
import type { SpeechTone, DialogueType } from "@/lib/game/voice/types";

interface Props {
  playerHand: BattleCardType[];
  onSelect: (cardId: string) => void;
  onCardInfo: (cardId: string) => void;
  playSfx: (name: string) => void;
  showDialogue?: (celebId: string, tone: SpeechTone, type: DialogueType, meta?: { nickname: string; avatarUrl: string | null }) => void;
}

export default function CaptainSelect({ playerHand, onSelect, onCardInfo, playSfx, showDialogue }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedId) return;
    playSfx("sfx-confirm.mp3");
    const captain = playerHand.find((c) => c.id === selectedId);
    if (captain) showDialogue?.(captain.id, captain.speechTone, "deploy", { nickname: captain.nickname, avatarUrl: captain.avatarUrl });
    onSelect(selectedId);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      {/* 헤더 */}
      <div className="text-center space-y-2 bg-black/80 rounded-lg px-6 py-4">
        <Crown className="w-8 h-8 mx-auto text-amber-400" />
        <h2 className="text-xl font-serif font-black text-white">주장 선택</h2>
        <p className="text-sm text-white/70 max-w-xs">
          주장이 손패에 있으면 아군 전원 적성 +15%.
        </p>
        <p className="text-sm text-white/70 max-w-xs">
          주장이 직접 출전하면 본인 적성 ×1.5.
        </p>
      </div>

      {/* 카드 목록 */}
      <div className="flex flex-wrap justify-center gap-3">
        {playerHand.map((card) => (
          <div key={card.id} className="w-[120px] lg:w-[176px]">
            <BattleCard
              card={card}
              selected={selectedId === card.id}
              isCaptain={selectedId === card.id}
              onClick={() => {
                playSfx("sfx-card-select.mp3");
                setSelectedId(card.id);
                showDialogue?.(card.id, card.speechTone, "answer", { nickname: card.nickname, avatarUrl: card.avatarUrl });
              }}
              onInfo={() => onCardInfo(card.id)}
            />
          </div>
        ))}
      </div>

      {/* 임명 버튼 (목패 스타일) */}
      <button
        onClick={handleConfirm}
        disabled={!selectedId}
        className={`
          relative overflow-hidden rounded-[4px] transition-all
          ${selectedId
            ? "cursor-pointer active:scale-95 shadow-[2px_4px_12px_rgba(0,0,0,0.6),0_0_20px_rgba(212,175,55,0.3)]"
            : "cursor-not-allowed opacity-40 saturate-0 shadow-[2px_3px_8px_rgba(0,0,0,0.4)]"
          }
        `}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/textures/wood-tablet.jpg')",
            filter: selectedId ? "brightness(0.55) saturate(0.9)" : "brightness(0.3) saturate(0.5)",
          }}
        />
        <div className="relative flex flex-col items-center px-12 py-4 gap-1.5">
          <Crown className="w-6 h-6 text-amber-300 drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]" />
          <div className="w-10 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          <span className="text-lg font-serif font-black text-amber-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] tracking-widest">
            임명
          </span>
        </div>
      </button>
    </div>
  );
}
