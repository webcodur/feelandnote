/*
  파일명: components/features/game/dawn/DawnQuizCard.tsx
  기능: 여명 게임 출제 카드 (상단 "이 인물은 어디에?")
  책임: 이미지 + 하단 텍스트 분리 구조. 직군·이름·연도 reveal
*/
"use client";

import Image from "next/image";
import { HelpCircle } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";

interface DawnQuizCardProps {
  imageUrl?: string | null;
  name: string;
  title?: string | null;
  subText?: string | React.ReactNode;
  isRevealed?: boolean;
  onClick?: () => void;
  onInfoClick?: () => void;
  className?: string;
}

export default function DawnQuizCard({
  imageUrl,
  name,
  title,
  subText,
  isRevealed = false,
  onClick,
  onInfoClick,
  className,
}: DawnQuizCardProps) {
  const locale = useLocale();

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center",
        onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {/* 이미지 */}
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border-2 border-accent/40 shadow-2xl shadow-black/60">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 128px, 192px"
            className="object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
            <span className="text-3xl md:text-5xl font-serif text-border font-bold opacity-30">
              {name.charAt(0)}
            </span>
          </div>
        )}

        {/* 인물 정보 버튼 */}
        {onInfoClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onInfoClick(); }}
            className="absolute top-1.5 end-1.5 md:top-2 md:end-2 z-20 w-6 h-6 md:w-7 md:h-7 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/60 active:scale-90 transition-all"
          >
            <HelpCircle size={14} className="md:hidden" />
            <HelpCircle size={16} className="hidden md:block" />
          </button>
        )}
      </div>

      {/* 텍스트 정보 (이미지 아래) */}
      <div className="mt-1.5 md:mt-2 flex flex-col items-center text-center w-full">
        {title && (
          <span className="text-[10px] md:text-xs text-accent font-bold tracking-wider mb-0.5">
            {getCelebProfessionLabel(title, locale)}
          </span>
        )}

        <h3 className={cn(
          "font-serif font-bold text-accent leading-tight word-keep-all",
          name.length > 8 ? "text-[11px] md:text-sm line-clamp-2" : "text-xs md:text-base line-clamp-1"
        )}>
          {name}
        </h3>

        {(isRevealed && subText) && (
          <>
            <div className="w-6 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent my-0.5 md:my-1" />
            <div className="font-cinzel font-bold tracking-tighter transition-all duration-300 leading-none text-base md:text-xl text-white drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
              {subText}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
