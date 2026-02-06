/*
  파일명: components/features/game/GameHeader.tsx
  기능: 게임 공통 헤더
  책임: 난이도 표시 및 점수(현재 연속/최고) 현황판 렌더링
*/
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

interface GameHeaderProps {
  difficulty: "easy" | "hard";
  difficultyLabel: string;
  streak: number;
  highScore: number;
  remaining?: number; // 연대기 게임용
  onBack?: () => void;
  className?: string;
}

export default function GameHeader({
  difficulty,
  difficultyLabel,
  streak,
  highScore,
  remaining,
  onBack,
  className,
}: GameHeaderProps) {
  return (
    <div className={cn("relative w-full h-10 md:h-14 px-2 md:px-0 flex items-center justify-center", className)}>
      {/* Back button (always on the left if present) */}
      {onBack && (
        <div className="absolute left-2 md:left-0">
          <button
            onClick={onBack}
            className="group flex items-center justify-center w-7 h-7 md:w-10 md:h-10 rounded-full border border-white/10 bg-black/40 hover:bg-white/10 hover:border-accent/50 transition-all text-text-secondary hover:text-white"
            aria-label="시작 화면으로"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Central HUD Container (Stone Tablet Style) */}
      <div className="flex items-center gap-6 md:gap-12 px-5 md:px-10 py-2 md:py-3 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">

        {/* Difficulty Column */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] md:text-xs text-text-tertiary font-cinzel tracking-wider uppercase">난이도</span>
          <span className="text-lg md:text-2xl font-serif font-black text-white leading-none drop-shadow-md">
            {difficultyLabel}
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 md:h-10 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

        {/* Score Column */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] md:text-xs text-text-tertiary font-cinzel tracking-wider uppercase">최고점수</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg md:text-2xl font-serif font-black text-white leading-none drop-shadow-md">
              {streak}
            </span>
            <span className="text-sm md:text-lg font-serif font-medium text-text-secondary">/</span>
            <span className="text-lg md:text-2xl font-serif font-black text-accent leading-none drop-shadow-md">
              {highScore}
            </span>
          </div>
        </div>

        {/* Remaining Cards (Optional) */}
        {remaining !== undefined && (
          <>
            <div className="h-8 md:h-10 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] md:text-xs text-text-tertiary font-cinzel tracking-wider uppercase">남은 카드</span>
              <span className="text-lg md:text-2xl font-serif font-black text-white leading-none drop-shadow-md">
                {remaining}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
