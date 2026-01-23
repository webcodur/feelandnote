/*
  파일명: components/features/game/GameHeader.tsx
  기능: 게임 공통 헤더
  책임: 난이도 표시 및 점수(현재 연속/최고) 현황판 렌더링
*/
import { Flame } from "lucide-react";

interface GameHeaderProps {
  difficulty: "easy" | "hard";
  difficultyLabel: string;
  streak: number;
  highScore: number;
  remaining?: number; // 연대기 게임용
}

export default function GameHeader({
  difficulty,
  difficultyLabel,
  streak,
  highScore,
  remaining,
}: GameHeaderProps) {
  const isEasy = difficulty === "easy";

  return (
    <div className="flex items-center justify-between mb-6 h-12">
      {/* 왼쪽: 난이도 뱃지 */}
      <div className="flex items-center">
        <span
          className={`px-3 py-1 text-xs font-bold rounded-lg border whitespace-nowrap ${
            isEasy
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}
        >
          {difficultyLabel}
        </span>
        {remaining !== undefined && (
          <span className="ml-3 text-xs text-text-tertiary">
            남은 카드: {remaining}
          </span>
        )}
      </div>

      {/* 오른쪽: 점수판 (분수 형태 디자인 적용) */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-accent">
            <Flame size={14} className="fill-accent" />
            <span className="text-lg font-black leading-none">{streak}</span>
          </div>
          <div className="w-full h-px bg-white/20 my-0.5" />
          <div className="text-[10px] text-text-tertiary font-medium">
            BEST <span className="text-text-secondary ml-0.5">{highScore}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
