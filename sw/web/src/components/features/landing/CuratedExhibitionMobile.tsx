"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";

interface CuratedExhibitionMobileProps {
  activeTag: FeaturedTag;
  onCelebClick: (celeb: FeaturedCeleb) => void;
}

export default function CuratedExhibitionMobile({ activeTag, onCelebClick }: CuratedExhibitionMobileProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const heroCeleb = activeTag.celebs[selectedIndex];
  const celebsCount = activeTag.celebs.length;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchMoved = useRef(false);
  const SWIPE_THRESHOLD = 30; // 스와이프 감도 향상
  const CLICK_THRESHOLD = 8; // 이 이하면 클릭으로 판정

  const canGoNext = selectedIndex < celebsCount - 1;
  const canGoPrev = selectedIndex > 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchMoved.current = false;
    setIsSwiping(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;
    // X 또는 Y 방향으로 일정 이상 움직이면 드래그로 판정
    if (Math.abs(diffX) > CLICK_THRESHOLD || Math.abs(diffY) > CLICK_THRESHOLD) {
      touchMoved.current = true;
    }
    const resistance = (!canGoPrev && diffX > 0) || (!canGoNext && diffX < 0) ? 0.3 : 1;
    setDragOffset(diffX * resistance);
  };

  const handleTouchEnd = () => {
    // 스와이프 처리
    if (Math.abs(dragOffset) > SWIPE_THRESHOLD) {
      if (dragOffset < 0 && canGoNext) {
        setSlideDirection("left");
        setSelectedIndex(selectedIndex + 1);
      } else if (dragOffset > 0 && canGoPrev) {
        setSlideDirection("right");
        setSelectedIndex(selectedIndex - 1);
      }
    }
    // 클릭 처리 (터치 이동이 없었을 때)
    else if (!touchMoved.current && heroCeleb) {
      onCelebClick(heroCeleb);
    }
    setDragOffset(0);
    setIsSwiping(false);
    setTimeout(() => setSlideDirection(null), 350);
  };

  return (
    <>
      {/* Hero Card - 스와이프 지원 */}
      <div className="px-4 py-6 mb-2">
         <div
           className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 select-none"
           onTouchStart={handleTouchStart}
           onTouchMove={handleTouchMove}
           onTouchEnd={handleTouchEnd}
         >
            {/* 드래그에 따라 움직이는 콘텐츠 */}
            <div
              key={selectedIndex}
              className={cn(
                "absolute inset-0",
                slideDirection === "left" && "animate-slide-in-right",
                slideDirection === "right" && "animate-slide-in-left"
              )}
              style={{
                transform: isSwiping ? `translateX(${dragOffset * 0.3}px)` : undefined,
                opacity: isSwiping ? 1 - Math.abs(dragOffset) * 0.002 : 1,
              }}
            >
              {heroCeleb.portrait_url || heroCeleb.avatar_url ? (
                <Image
                  src={heroCeleb.portrait_url || heroCeleb.avatar_url!}
                  alt={heroCeleb.nickname}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  priority={selectedIndex === 0}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl text-white/10 font-serif font-black">{heroCeleb.nickname[0]}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

              <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 flex flex-col">
                 <div className="w-10 h-1 bg-accent mb-3 shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                 <span className="text-accent text-xs font-serif font-bold tracking-wider mb-1">
                   {heroCeleb.title}
                 </span>
                 <h3 className="text-3xl text-white font-serif font-black leading-none mb-3">
                   {heroCeleb.nickname}
                 </h3>
                 <p className="text-white/80 text-sm font-sans line-clamp-2">
                   "{heroCeleb.short_desc}"
                 </p>
              </div>
            </div>

            {/* 스와이프 인디케이터 - 하단 중앙 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {activeTag.celebs.map((_, idx) => {
                const isNext = (dragOffset < -SWIPE_THRESHOLD && idx === selectedIndex + 1);
                const isPrev = (dragOffset > SWIPE_THRESHOLD && idx === selectedIndex - 1);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      idx === selectedIndex ? "bg-accent w-4" : "bg-white/30",
                      (isNext || isPrev) && "bg-accent/70 scale-125"
                    )}
                  />
                );
              })}
            </div>
         </div>
      </div>

      {/* Selectable List (All Items) */}
      <div className="px-2">
        <h4 className="text-xs font-cinzel text-text-tertiary mb-3 pl-1">MORE FIGURES</h4>
        <div className="flex gap-3 overflow-x-auto scrollbar-hidden pb-4">
          {activeTag.celebs.map((celeb, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div 
                key={celeb.id}
                className={cn(
                  "flex-shrink-0 w-24 flex flex-col gap-2 transition-all duration-300",
                  isSelected ? "opacity-100 scale-105" : "opacity-60"
                )}
                onClick={() => setSelectedIndex(idx)}
              >
                 <div className={cn(
                   "relative w-24 h-32 rounded-lg overflow-hidden border bg-bg-card transition-colors",
                   isSelected ? "border-accent shadow-lg shadow-accent/10" : "border-white/10"
                 )}>
                    {celeb.avatar_url ? (
                      <Image
                        src={celeb.avatar_url}
                        alt={celeb.nickname}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-text-tertiary">
                        <span className="font-serif text-lg">{celeb.nickname[0]}</span>
                      </div>
                    )}
                 </div>
                 <div className="flex flex-col items-center">
                   {celeb.title && (
                     <span className={cn(
                       "text-[9px] font-cinzel font-bold tracking-widest uppercase leading-tight truncate w-full text-center",
                       isSelected ? "text-amber-500" : "text-amber-500/60"
                     )}>
                       {celeb.title}
                     </span>
                   )}
                   <span className={cn(
                     "text-[11px] text-center truncate font-sans font-bold tracking-wide w-full transition-colors",
                     isSelected ? "text-white" : "text-text-secondary"
                   )}>
                     {celeb.nickname}
                   </span>
                 </div>
              </div>
            );
          })}
          
          <Link 
            href={`/explore?tagId=${activeTag.id}`}
            className="flex-shrink-0 w-24 h-32 rounded-lg border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 bg-white/5 opacity-60"
          >
             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-text-tertiary">
               <ArrowRight size={14} />
             </div>
             <span className="text-[10px] text-text-tertiary">View All</span>
          </Link>
        </div>
      </div>
    </>
  );
}
