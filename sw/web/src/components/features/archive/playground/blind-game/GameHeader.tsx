/*
  파일명: /components/features/playground/blind-game/GameHeader.tsx
  기능: 블라인드 게임 헤더 표시
  책임: 점수, 연속 정답, 최고 연속 정답 및 닫기 버튼 렌더링
*/ // ------------------------------
"use client";

import { X, Flame } from "lucide-react";
import Button from "@/components/ui/Button";

interface GameHeaderProps {
  score: number;
  streak: number;
  maxStreak: number;
  onClose: () => void;
}

export default function GameHeader({ score, streak, maxStreak, onClose }: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-bg-secondary">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-sm text-text-secondary">총 점수</div>
          <div className="text-2xl font-bold text-accent">{score}점</div>
        </div>
        <div className="w-px h-10 bg-border" />
        <div>
          <div className="text-sm text-text-secondary">연속 정답</div>
          <div className="text-2xl font-bold flex items-center gap-1">
            <Flame className="text-orange-500" size={24} />
            {streak}
          </div>
        </div>
        {maxStreak > 0 && (
          <>
            <div className="w-px h-10 bg-border" />
            <div>
              <div className="text-sm text-text-secondary">최고 연속</div>
              <div className="text-lg font-bold text-yellow-500">{maxStreak}</div>
            </div>
          </>
        )}
      </div>
      <Button
        unstyled
        onClick={onClose}
        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
      >
        <X size={20} />
      </Button>
    </div>
  );
}
