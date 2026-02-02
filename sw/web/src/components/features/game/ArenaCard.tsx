/*
  파일명: components/features/game/ArenaCard.tsx
  기능: 아레나 게임 공용 카드 UI
  디자인: Neo-Pantheon 스타일 (대리석, 금테, 깊은 그림자)
*/
"use client";

import Image from "next/image";
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
  className,
}: ArenaCardProps) {
  
  // 상태별 테두리 색상
  const borderClass = {
    normal: "border-border/60 hover:border-accent/50",
    win: "border-green-500/80 shadow-green-500/20",
    lose: "border-red-500/80 shadow-red-500/20",
    selected: "border-accent shadow-accent/30 scale-[1.02]",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group flex flex-col overflow-hidden transition-all duration-300 isolate",
        "rounded-xl border-[1.5px]", // 기본 구조
        "shadow-2xl shadow-black/60", // 깊은 그림자
        borderClass[status],
        onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {/* 0. 배경 텍스처 (대리석 질감 시뮬레이션) */}
      <div className="absolute inset-0 bg-[#1a1a1a] -z-10">
         {/* Noise Texture */}
         <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />
         {/* Marble Veins (Subtle Gradient) */}
         <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/40 opacity-50" />
      </div>

      {/* 1. 이미지 레이어 */}
      <div className="relative flex-1 w-full bg-bg-secondary overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 320px"
            className={cn(
              "object-cover object-top transition-transform duration-700",
              status === "selected" || status === "win" ? "scale-110" : "group-hover:scale-105"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
             <span className="text-2xl md:text-4xl font-serif text-border font-bold opacity-30">
               {name.charAt(0)}
             </span>
          </div>
        )}
        
        {/* 오버레이: 상단 -> 투명, 하단 -> 검정 (텍스트 가독성 확보를 위해 더 진하게) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        
        {/* 상태 오버레이 (정답/오답 시 색상 틴트 + 광택) */}
        {status === "win" && (
           <>
             <div className="absolute inset-0 bg-green-500/20 mix-blend-overlay" />
             <div className="absolute inset-0 ring-inset ring-2 ring-green-400/50 rounded-xl" />
           </>
        )}
        {status === "lose" && (
           <>
             <div className="absolute inset-0 bg-red-500/20 mix-blend-overlay" />
             <div className="absolute inset-0 ring-inset ring-2 ring-red-400/50 rounded-xl" />
           </>
        )}
      </div>

      {/* 2. 텍스트 정보 레이어 (하단 배치) */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-3 flex flex-col items-center text-center z-10">

        {/* 수식어 (작은 글씨) - 국문 변환 */}
        {title && !isHidden && (
          <span className="text-[8px] md:text-[10px] text-accent/90 tracking-wider mb-0.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            {getCelebProfessionLabel(title)}
          </span>
        )}

        {/* 이름 (메인, Serif) - 크기 대폭 축소 */}
        <div className="w-full flex items-center justify-center">
          <h3 className={cn(
            "font-serif font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight word-keep-all",
            name.length > 8 ? "text-[11px] md:text-sm line-clamp-2" : "text-xs md:text-base line-clamp-1"
          )}>
            {isHidden ? "???" : name}
          </h3>
        </div>

        {/* 구분선 (금빛 그라데이션) */}
        <div className="w-6 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent my-0.5 md:my-1" />

        {/* 하단 스탯 (점수/연도 등) */}
        <div className="flex flex-col items-center gap-0 justify-center">
          {subTextLabel && (
            <span className="text-[7px] md:text-[9px] text-text-tertiary font-cinzel tracking-[0.15em] uppercase mb-0.5">
              {subTextLabel}
            </span>
          )}

          <div className={cn(
            "font-cinzel font-bold tracking-tighter drop-shadow-xl transition-all leading-none",
            "text-base md:text-xl",
            status === "win" ? "text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" :
            status === "lose" ? "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]" :
            status === "selected" ? "text-accent drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" : "text-white"
          )}>
            {isRevealed ? subText : (
               <span className="opacity-50 tracking-widest text-sm md:text-lg">???</span>
            )}
          </div>
        </div>
      </div>
      
      {/* 3. 장식적 요소 (Inner Border/Shine) */}
      <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
      
      {/* 4. 선택됨 효과 (Gold Glow) */}
      {status === "selected" && (
         <div className="absolute inset-0 ring-2 ring-accent/50 rounded-xl animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
