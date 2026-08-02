/*
  파일명: components/features/game/dawn/DawnBoardCard.tsx
  기능: 여명 게임 연대표 카드 (배치판)
  책임: 이미지 + 이름 + 연도를 하나의 카드 컴포넌트로 묶어 border/배경 통일
  스타일: DawnQuizCard와 동일 계열 (accent border, bg-bg-secondary)
*/
"use client";

import { useRef } from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import BlurDissolve from "@/components/ui/BlurDissolve";

const TAP_THRESHOLD = 10; // px — 이 이내면 탭으로 판정

interface DawnBoardCardProps {
  imageUrl?: string | null;
  name: string;
  year: string;
  profession?: string | null;
  isHighlighted?: boolean;
  isNewlyPlaced?: boolean;
  /** 카드 본체 클릭 — 대사 표시용 */
  onCardClick?: () => void;
  /** info 버튼 클릭 — 상세 모달용 */
  onInfoClick?: () => void;
  className?: string;
}

export default function DawnBoardCard({
  imageUrl,
  name,
  year,
  profession,
  isHighlighted,
  isNewlyPlaced,
  onCardClick,
  onInfoClick,
  className,
}: DawnBoardCardProps) {
  const locale = useLocale();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = () => {
    // pointerUp에서 드래그 감지 시 null 처리됨 → 탭만 통과
    if (!onCardClick || !pointerStart.current) return;
    onCardClick();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current || !onCardClick) return;
    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);
    if (dx > TAP_THRESHOLD || dy > TAP_THRESHOLD) {
      // 드래그/스와이프 — onClick 억제
      pointerStart.current = null;
    }
  };

  return (
    <div
      data-board-card
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border-2 shadow-lg shadow-black/40 transition-all duration-500",
        isNewlyPlaced
          ? "border-accent shadow-[0_0_20px_rgba(212,175,55,0.5)]"
          : isHighlighted
            ? "border-accent shadow-[0_0_16px_rgba(212,175,55,0.4)]"
            : "border-accent/40",
        onCardClick && "cursor-pointer active:scale-[0.97]",
        className
      )}
    >
      {/* 우상단 인포 아이콘 */}
      {onInfoClick && (
        <button
          onClick={(e) => { e.stopPropagation(); onInfoClick(); }}
          className="absolute top-1 right-1 z-10 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-black/60 border border-white/20 text-white/60 hover:text-white hover:bg-black/80 transition-colors"
        >
          <Info size={12} className="md:hidden" />
          <Info size={14} className="hidden md:block" />
        </button>
      )}

      {/* 이미지 — 모바일: 정사각형 / 데스크탑: 3:4 */}
      <div className="relative aspect-square md:aspect-[3/4] w-full overflow-hidden">
        {imageUrl ? (
          <BlurDissolve className="absolute inset-0">
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 768px) 96px, 160px"
              className="object-cover object-top"
            />
          </BlurDissolve>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
            <span className="text-lg md:text-2xl font-serif text-border font-bold opacity-30">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* 텍스트 영역 — QuizCard와 동일 배경/색상 계열 */}
      <div className="bg-white/[0.08] px-1.5 py-1 md:px-2 md:py-1.5 flex flex-col items-center text-center">
        {profession && (
          <span className="text-[8px] md:text-[10px] text-accent font-bold tracking-wider">
            {getCelebProfessionLabel(profession, locale)}
          </span>
        )}

        <h3 className={cn(
          "font-serif font-bold text-white leading-tight word-keep-all",
          name.length > 8 ? "text-[10px] md:text-sm line-clamp-2" : "text-[11px] md:text-base line-clamp-1"
        )}>
          {name}
        </h3>

        <span className="font-cinzel font-bold text-xs md:text-lg text-accent leading-none mt-0.5">
          {year}
        </span>
      </div>
    </div>
  );
}
