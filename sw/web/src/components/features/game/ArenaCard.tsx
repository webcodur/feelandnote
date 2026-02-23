/*
  파일명: components/features/game/ArenaCard.tsx
  기능: 아레나 게임 공용 카드 UI
  디자인: Neo-Pantheon 스타일 (대리석, 금테, 깊은 그림자)
*/
"use client";

import Image from "next/image";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";

interface ArenaCardProps {
  imageUrl?: string | null;
  name: string;
  title?: string | null; // 수식어 (작은 텍스트)
  
  // 상태 및 컨텐츠
  subText?: string | React.ReactNode; // 하단 텍스트 (점수, 연도 등)
  subTextLabel?: string; // 하단 텍스트 라벨 (예: "영향력", "생년")
  
  isRevealed?: boolean; // 뒷면/앞면 여부 (여기서는 컨텐츠 공개 여부)
  isHidden?: boolean; // ? 표시 (아예 정보 숨김 - 고수 모드 등)
  
  status?: "normal" | "win" | "lose" | "selected";
  
  onClick?: () => void;
  onInfoClick?: () => void; // ? 버튼 클릭 (셀럽 상세 모달)
  className?: string; // 외부 스타일 주입
}

export default function ArenaCard({
  imageUrl,
  name,
  title,
  subText,
  subTextLabel,
  isRevealed = true,
  isHidden = false,
  status = "normal",
  onClick,
  onInfoClick,
  className,
}: ArenaCardProps) {
  
  // 상태별 테두리 색상
  const borderClass = {
    normal: "border-border/60 hover:border-accent",
    win: "border-green-500/80 shadow-green-500/20",
    lose: "border-red-500/80 shadow-red-500/20",
    selected: "border-accent shadow-accent/30 scale-[1.02]",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center",
        onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {/* 1. 원형 이미지 */}
      <div className={cn(
        "relative aspect-square w-full rounded-full overflow-hidden",
        "border-2 shadow-2xl shadow-black/60",
        borderClass[status],
      )}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 25vw, 240px"
            className="object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
             <span className="text-2xl md:text-4xl font-serif text-border font-bold opacity-30">
               {name.charAt(0)}
             </span>
          </div>
        )}

        {/* 인물 정보 버튼 */}
        {onInfoClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onInfoClick(); }}
            className="absolute top-1 end-1 md:top-2 md:end-2 z-20 w-6 h-6 md:w-7 md:h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 active:scale-90"
          >
            <HelpCircle size={14} className="md:hidden" />
            <HelpCircle size={16} className="hidden md:block" />
          </button>
        )}

        {/* 선택됨 효과 */}
        {status === "selected" && (
          <div className="absolute inset-0 ring-2 ring-accent/50 rounded-full animate-pulse pointer-events-none" />
        )}
      </div>

      {/* 2. 텍스트 정보 (하단) */}
      <div className="mt-1.5 md:mt-2 flex flex-col items-center text-center w-full">

        {title && !isHidden && (
          <span className="text-[10px] md:text-xs text-accent font-bold tracking-wider mb-0.5">
            {getCelebProfessionLabel(title)}
          </span>
        )}

        <h3 className={cn(
          "font-serif font-bold text-white leading-tight word-keep-all",
          name.length > 8 ? "text-[11px] md:text-sm line-clamp-2" : "text-xs md:text-base line-clamp-1"
        )}>
          {isHidden ? "???" : name}
        </h3>

        {/* 구분선 */}
        <div className="w-6 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent my-0.5 md:my-1" />

        {/* 하단 스탯 */}
        <div className="flex items-baseline gap-1 justify-center">
          <div className={cn(
            "font-cinzel font-bold tracking-tighter transition-all leading-none",
            "text-base md:text-xl",
            status === "selected" ? "text-accent drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" : "text-white"
          )}>
            {isRevealed ? subText : (
               <span className="opacity-50 tracking-widest text-sm md:text-lg">???</span>
            )}
          </div>
          {subTextLabel && isRevealed && (
            <span className="text-[9px] md:text-xs text-text-secondary font-cinzel">
              {subTextLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
