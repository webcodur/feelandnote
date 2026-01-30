"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
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
  const SWIPE_THRESHOLD = 80;

  const canGoNext = selectedIndex < celebsCount - 1;
  const canGoPrev = selectedIndex > 0;
  const willChange = Math.abs(dragOffset) > SWIPE_THRESHOLD &&
    ((dragOffset < 0 && canGoNext) || (dragOffset > 0 && canGoPrev));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    const resistance = (!canGoPrev && diff > 0) || (!canGoNext && diff < 0) ? 0.3 : 1;
    setDragOffset(diff * resistance);
  };

  const handleTouchEnd = () => {
    if (Math.abs(dragOffset) > SWIPE_THRESHOLD) {
      if (dragOffset < 0 && canGoNext) {
        setSlideDirection("left");
        setSelectedIndex(selectedIndex + 1);
      } else if (dragOffset > 0 && canGoPrev) {
        setSlideDirection("right");
        setSelectedIndex(selectedIndex - 1);
      }
    }
    setDragOffset(0);
    setIsSwiping(false);
    setTimeout(() => setSlideDirection(null), 350);
  };

  return (
    <>
      {/* Hero Card - 스와이프 지원 */}
      <div className="px-4 py-8 mb-4">
         <div
           className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 select-none"
           onTouchStart={handleTouchStart}
           onTouchMove={handleTouchMove}
           onTouchEnd={handleTouchEnd}
         >
            {/* 스와이프 인디케이터 - 좌상단 */}
            <div className="absolute top-4 left-4 flex gap-1.5 z-20">
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

            {/* 전환 힌트 화살표 */}
            {willChange && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2 z-40 text-accent text-3xl font-bold animate-pulse",
                dragOffset < 0 ? "right-4" : "left-4"
              )}>
                {dragOffset < 0 ? "→" : "←"}
              </div>
            )}

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

              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col">
                 <div className="w-10 h-1 bg-accent mb-3 shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                 <span className="text-accent text-xs font-serif font-bold tracking-wider mb-1">
                   {heroCeleb.title}
                 </span>
                 <h3 className="text-3xl text-white font-serif font-black leading-none mb-3">
                   {heroCeleb.nickname}
                 </h3>
                 <p className="text-white/80 text-sm font-serif italic line-clamp-2">
                   "{heroCeleb.short_desc}"
                 </p>
              </div>
            </div>

            {/* 클릭 유도 버튼 - 우하단 (더 아래쪽) */}
            <button
              onClick={() => onCelebClick(heroCeleb)}
              className="absolute bottom-8 right-4 z-30 flex items-center gap-1.5 px-3 py-2 bg-accent/90 hover:bg-accent text-black text-xs font-bold rounded-full shadow-lg shadow-accent/30"
            >
              <Sparkles size={14} />
              <span>자세히</span>
            </button>
         </div>
      </div>

      {/* Detail Description (Curator's Note) */}
      <div className="px-3 mb-10 h-40 relative z-10">
         <div key={heroCeleb.id} className="relative h-full pl-3 border-l-2 border-accent/30 animate-in fade-in slide-in-from-right-2 duration-500 flex flex-col">
            <h4 className="flex-shrink-0 text-[10px] font-cinzel text-accent mb-1.5 tracking-widest uppercase flex items-center gap-2">
              Curator's Note
            </h4>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <p className="text-gray-300 text-sm leading-6 font-sans whitespace-pre-line">
                {heroCeleb.long_desc}
              </p>
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
                 <span className={cn(
                   "text-xs text-center truncate font-serif transition-colors",
                   isSelected ? "text-accent font-bold" : "text-text-secondary"
                 )}>
                   {celeb.nickname}
                 </span>
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
