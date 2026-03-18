/*
  파일명: DawnGame/sections/GameHud.tsx
  기능: 게임 HUD — 체력, 점수, 남은 인물 표시 (모바일+데스크탑)
*/
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { INITIAL_LIVES } from "../types";

interface GameHudProps {
  lives: number;
  streak: number;
  highScore: number;
  remainingCount: number;
  lostLifeAnim: boolean;
  tDawnGame: (key: string) => string;
}

/** 데스크탑 전용: 좌측 플로팅 체력 */
export function DesktopLives({ lives, lostLifeAnim }: Pick<GameHudProps, "lives" | "lostLifeAnim">) {
  return (
    <div className={cn(
      "hidden md:flex absolute left-6 top-18 z-30 flex-col items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-xl px-2 py-2.5 border border-white/10",
      lostLifeAnim && "animate-shake"
    )}>
      {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
        <Heart
          key={i}
          size={18}
          className={cn(
            "transition-all duration-300",
            i < lives
              ? "text-red-400 fill-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.5)]"
              : "text-white/20"
          )}
        />
      ))}
    </div>
  );
}

/** 데스크탑 전용: 우측 플로팅 점수+남은 */
export function DesktopScore({ streak, highScore, remainingCount, tDawnGame }: Pick<GameHudProps, "streak" | "highScore" | "remainingCount" | "tDawnGame">) {
  return (
    <div className="hidden md:flex absolute right-6 top-18 z-30 flex-col items-center gap-2 bg-black/50 backdrop-blur-sm rounded-xl px-2.5 py-2.5 border border-white/10">
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-text-tertiary font-cinzel tracking-wider uppercase">{tDawnGame("score")}</span>
        <div className="flex items-baseline gap-0.5">
          <span className="text-base font-serif font-black text-white leading-none">{streak}</span>
          <span className="text-[10px] text-text-secondary">/</span>
          <span className="text-base font-serif font-black text-accent leading-none">{highScore}</span>
        </div>
      </div>
      <div className="w-6 h-px bg-white/10" />
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-text-tertiary font-cinzel tracking-wider uppercase">{tDawnGame("remaining")}</span>
        <span className="text-base font-serif font-black text-white leading-none">{remainingCount}</span>
      </div>
    </div>
  );
}

/** 모바일 통합 상단 헤더 바 */
export function MobileHeader({ lives, streak, highScore, remainingCount, lostLifeAnim, tDawnGame }: GameHudProps) {
  return (
    <div className={cn(
      "md:hidden fixed top-11 left-2 right-2 z-30 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-lg px-3 py-1 border border-white/10",
      lostLifeAnim && "animate-shake"
    )}>
      {/* 하트 */}
      <div className="flex items-center gap-1">
        {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
          <Heart
            key={i}
            size={14}
            className={cn(
              "transition-all duration-300",
              i < lives ? "text-red-400 fill-red-400" : "text-white/20"
            )}
          />
        ))}
      </div>
      {/* 점수 */}
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-serif font-black text-white leading-none">{streak}</span>
        <span className="text-[9px] text-text-secondary">/</span>
        <span className="text-sm font-serif font-black text-accent leading-none">{highScore}</span>
      </div>
      {/* 남은 */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-text-tertiary">{tDawnGame("remaining")}</span>
        <span className="text-sm font-serif font-black text-white leading-none">{remainingCount}</span>
      </div>
    </div>
  );
}
