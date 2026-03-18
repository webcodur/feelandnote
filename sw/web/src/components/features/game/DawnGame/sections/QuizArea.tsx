/*
  파일명: DawnGame/sections/QuizArea.tsx
  기능: 퀴즈 카드 + 횃불(힌트) + 시간의 눈 버튼 영역
*/
import type { RefObject } from "react";
import { Flame, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import DawnBoardCard from "../../dawn/DawnBoardCard";
import { formatYear } from "../useDawnGame";
import type { DawnCeleb, HintType } from "../types";

interface QuizAreaProps {
  currentCard: DawnCeleb;
  nextCardKey: number;
  quizCardHidden: boolean;
  nextCardRevealed: boolean;
  isRevealing: boolean;
  wrongPosition: number | null;
  isGameOver: boolean;
  centuryText: string | null;
  torches: number;
  hintAnnounce: { type: HintType; label: string; icon: string; desc: string } | null;
  quizCardRef: RefObject<HTMLDivElement | null>;
  tDawnGame: (key: string) => string;
  // actions
  onRevealCard: () => void;
  onUseHint: () => void;
  onOpenEyeOfTime: () => void;
  onCardClick: () => void;
  onInfoClick: () => void;
}

export default function QuizArea({
  currentCard,
  nextCardKey,
  quizCardHidden,
  nextCardRevealed,
  isRevealing,
  wrongPosition,
  isGameOver,
  centuryText,
  torches,
  hintAnnounce,
  quizCardRef,
  tDawnGame,
  onRevealCard,
  onUseHint,
  onOpenEyeOfTime,
  onCardClick,
  onInfoClick,
}: QuizAreaProps) {
  return (
    <div className="z-20 mb-3 md:mb-6 flex flex-row items-center justify-center gap-2 md:gap-4 px-2">

      {/* 좌측: 횃불 (힌트) */}
      <button
        onClick={onUseHint}
        disabled={torches <= 0 || isRevealing || isGameOver || !!hintAnnounce}
        className={cn(
          "flex flex-col items-center gap-0.5 md:gap-1 px-2 py-2 md:px-2.5 md:py-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 transition-all",
          torches > 0 && !isRevealing && !hintAnnounce
            ? "text-orange-400 hover:bg-orange-500/20 cursor-pointer active:scale-95"
            : "text-white/20 cursor-not-allowed"
        )}
      >
        <Flame size={16} className={cn("md:hidden", torches > 0 && "drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]")} />
        <Flame size={20} className={cn("hidden md:block", torches > 0 && "drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]")} />
        <span className="text-[9px] md:text-[10px] font-bold">{torches}</span>
      </button>

      {/* 퀴즈 카드 */}
      <div ref={quizCardRef} key={nextCardKey} className={cn(
        "animate-in fade-in slide-in-from-top-4 duration-500 transition-opacity",
        quizCardHidden && "opacity-0 pointer-events-none"
      )}>
        {!nextCardRevealed ? (
          /* 플레이스홀더: DawnBoardCard와 동일 규격 */
          <button
            onClick={onRevealCard}
            className="w-32 md:w-44 flex flex-col overflow-hidden rounded-xl border-2 border-white/20 shadow-lg shadow-black/40 cursor-pointer hover:border-accent/50 active:scale-95 transition-all"
          >
            {/* 이미지 영역 — DawnBoardCard와 동일 aspect */}
            <div className="relative aspect-square md:aspect-[3/4] w-full overflow-hidden bg-stone-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl md:text-5xl font-serif font-black text-white/20">?</span>
              </div>
            </div>
            {/* 텍스트 영역 — DawnBoardCard와 동일 구조·패딩 */}
            <div className="bg-white/[0.05] px-1.5 py-1 md:px-2 md:py-1.5 flex flex-col items-center text-center">
              <span className="text-[8px] md:text-[10px] text-white/0 font-bold tracking-wider">&nbsp;</span>
              <span className="text-[11px] md:text-base font-serif font-bold text-white/30 leading-tight">{tDawnGame("tapToReveal")}</span>
              <span className="font-cinzel font-bold text-xs md:text-lg text-white/0 leading-none mt-0.5">&nbsp;</span>
            </div>
          </button>
        ) : (
          <DawnBoardCard
            imageUrl={currentCard.avatar_url}
            name={currentCard.nickname}
            year={
              ((isRevealing && wrongPosition === null) || isGameOver)
                ? formatYear(currentCard.birthYear)
                : centuryText || tDawnGame("unknownYear")
            }
            profession={currentCard.profession}
            className="w-32 md:w-44"
            onCardClick={onCardClick}
            onInfoClick={onInfoClick}
          />
        )}
      </div>

      {/* 우측: 시간의 눈 */}
      <button
        onClick={onOpenEyeOfTime}
        disabled={isRevealing || isGameOver}
        className={cn(
          "flex flex-col items-center gap-0.5 md:gap-1 px-2 py-2 md:px-2.5 md:py-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 transition-all",
          !isRevealing && !isGameOver
            ? "text-purple-400 hover:bg-purple-500/20 cursor-pointer active:scale-95"
            : "text-white/20 cursor-not-allowed"
        )}
      >
        <Eye size={16} className={cn("md:hidden", !isRevealing && !isGameOver && "drop-shadow-[0_0_4px_rgba(168,85,247,0.5)]")} />
        <Eye size={20} className={cn("hidden md:block", !isRevealing && !isGameOver && "drop-shadow-[0_0_4px_rgba(168,85,247,0.5)]")} />
        <span className="text-[9px] md:text-[10px] font-bold font-serif">{tDawnGame("eyeShort")}</span>
      </button>
    </div>
  );
}
