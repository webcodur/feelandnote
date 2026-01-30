"use client";

import { useState, useRef, lazy, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";

const CelebDetailModal = lazy(() => import("@/components/features/home/celeb-card-drafts/CelebDetailModal"));

interface CuratedExhibitionDesktopProps {
  activeTag: FeaturedTag;
  tags: FeaturedTag[];
  activeIndex: number;
  onTagChange: (index: number) => void;
}

export default function CuratedExhibitionDesktop({ activeTag, tags, activeIndex, onTagChange }: CuratedExhibitionDesktopProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null); 

  // Refs & Drags (하단 리스트용)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);
  const hasDragged = useRef(false);

  // Hero Card 드래그 (인물 전환용)
  const heroDragStartX = useRef(0);
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const heroHasDragged = useRef(false);

  const celebs = activeTag.celebs;
  const heroCeleb = celebs[selectedIndex];
  const SWIPE_THRESHOLD = 80;

  // 드래그 방향에 따른 다음/이전 인물
  const canGoNext = selectedIndex < celebs.length - 1;
  const canGoPrev = selectedIndex > 0;
  const willChange = Math.abs(dragOffset) > SWIPE_THRESHOLD &&
    ((dragOffset < 0 && canGoNext) || (dragOffset > 0 && canGoPrev));

  // 하단 리스트 Handlers
  const handleDragStart = (clientX: number) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = clientX;
    scrollStartLeft.current = scrollContainerRef.current.scrollLeft;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const diff = dragStartX.current - clientX;
    if (Math.abs(diff) > 5) hasDragged.current = true;
    scrollContainerRef.current.scrollLeft = scrollStartLeft.current + diff;
  };

  const handleDragEnd = () => setIsDragging(false);

  // Hero Card 드래그 Handlers
  const handleHeroDragStart = (clientX: number) => {
    setIsHeroDragging(true);
    heroHasDragged.current = false;
    heroDragStartX.current = clientX;
    setDragOffset(0);
  };

  const handleHeroDragMove = (clientX: number) => {
    if (!isHeroDragging) return;
    const diff = clientX - heroDragStartX.current;
    // 끝에서는 저항감 추가
    const resistance = (!canGoPrev && diff > 0) || (!canGoNext && diff < 0) ? 0.3 : 1;
    setDragOffset(diff * resistance);
    if (Math.abs(diff) > 5) heroHasDragged.current = true;
  };

  const handleHeroDragEnd = () => {
    if (!isHeroDragging) return;

    if (Math.abs(dragOffset) > SWIPE_THRESHOLD) {
      if (dragOffset < 0 && canGoNext) {
        setSlideDirection("left"); // 왼쪽으로 밀었으니 새 카드는 오른쪽에서 등장
        selectHero(selectedIndex + 1);
      } else if (dragOffset > 0 && canGoPrev) {
        setSlideDirection("right"); // 오른쪽으로 밀었으니 새 카드는 왼쪽에서 등장
        selectHero(selectedIndex - 1);
      }
    }

    setDragOffset(0);
    setIsHeroDragging(false);
    setTimeout(() => {
      heroHasDragged.current = false;
      setSlideDirection(null);
    }, 350);
  };

  const selectHero = (idx: number) => {
    if (idx !== selectedIndex) {
      setSelectedIndex(idx);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Tags */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
         {tags.map((tag, idx) => {
           const isActive = activeIndex === idx;
           return (
             <button
               key={tag.id}
               onClick={() => onTagChange(idx)}
               className={cn(
                 "relative px-4 py-2 text-sm font-medium transition-all duration-300",
                 isActive 
                   ? "text-accent font-bold" 
                   : "text-text-tertiary hover:text-text-primary"
               )}
             >
                {isActive && (
                  <span className="absolute inset-0 bg-accent/5 rounded-t-lg border-b-2 border-accent" />
                )}
                <span className="relative z-10 font-serif tracking-wide">{tag.name}</span>
             </button>
           );
         })}
      </div>

      {/* Tag Description */}
      <div className="animate-fade-in pl-1">
         <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep opacity-90 max-w-4xl">
           {activeTag.description || "역사 속 위인들의 콘텐츠 여정을 탐험해보세요."}
         </p>
      </div>

      {/* Hero Card - 전체 영역 클릭 시 모달 오픈, 좌우 드래그 시 인물 전환 */}
      <div
        className={cn(
          "group relative w-full aspect-[4/5] md:aspect-[16/7] overflow-hidden rounded-[4px] bg-[#0a0a0a] shadow-2xl select-none",
          isHeroDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={(e) => handleHeroDragStart(e.clientX)}
        onMouseMove={(e) => handleHeroDragMove(e.clientX)}
        onMouseUp={handleHeroDragEnd}
        onMouseLeave={handleHeroDragEnd}
        onClick={() => !heroHasDragged.current && heroCeleb && setModalCeleb(heroCeleb)}
      >
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

        {/* 스와이프 인디케이터 - 좌상단 */}
        <div className="absolute top-4 left-4 flex gap-1.5 z-30">
          {celebs.map((_, idx) => {
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
            "absolute top-1/2 -translate-y-1/2 z-40 text-accent text-4xl font-bold animate-pulse",
            dragOffset < 0 ? "right-4" : "left-4"
          )}>
            {dragOffset < 0 ? "→" : "←"}
          </div>
        )}

        <div
          key={selectedIndex}
          className={cn(
            "absolute inset-0 flex flex-col md:flex-row",
            slideDirection === "left" && "animate-slide-in-right",
            slideDirection === "right" && "animate-slide-in-left"
          )}
          style={{
            transform: isHeroDragging ? `translateX(${dragOffset * 0.3}px)` : undefined,
            opacity: isHeroDragging ? 1 - Math.abs(dragOffset) * 0.002 : 1,
          }}
        >
            {/* Left Content */}
            <div className="relative z-20 flex-1 p-6 md:p-10 flex flex-col justify-center order-2 md:order-1 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/90 to-transparent">
                <div className="flex flex-col gap-1 mb-5">
                  {heroCeleb?.title && (
                    <span className="text-sm md:text-base text-accent font-serif font-bold tracking-wider leading-snug">
                      {heroCeleb.title}
                    </span>
                  )}
                  <h3 className="text-lg md:text-2xl font-serif font-black text-white leading-tight tracking-tight">
                    {heroCeleb?.nickname}
                  </h3>
                </div>

                {heroCeleb?.short_desc && (
                  <div className="relative mb-4">
                     <p className="relative z-10 text-lg md:text-xl text-white font-serif font-bold italic leading-relaxed text-balance opacity-90">
                       "{heroCeleb.short_desc}"
                     </p>
                  </div>
                )}

                {heroCeleb?.long_desc && (
                  <div className="relative mt-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep opacity-80">
                      {heroCeleb.long_desc}
                    </p>
                  </div>
                )}
            </div>

            {/* Right Image */}
            <div className="relative w-full md:w-[28%] h-[60%] md:h-full order-1 md:order-2 overflow-hidden">
               <div className="absolute inset-0 transform group-hover:scale-105 transition-transform duration-700 ease-in-out">
                 {heroCeleb?.portrait_url || heroCeleb?.avatar_url ? (
                    <Image
                      src={heroCeleb.portrait_url || heroCeleb.avatar_url!}
                      alt={heroCeleb.nickname}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      priority={selectedIndex === 0}
                      className="object-cover object-top md:object-center filter brightness-[0.85] contrast-[1.1] group-hover:brightness-100 transition-all duration-500"
                    />
                 ) : (
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                       <span className="text-9xl text-white/5 font-serif font-black">{heroCeleb?.nickname?.[0]}</span>
                    </div>
                 )}
               </div>

               <div className="absolute inset-0 md:bg-gradient-to-l from-transparent via-transparent to-black" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent md:hidden" />
            </div>
        </div>

        {/* 넘버 뱃지 - 우상단 */}
        <div className="absolute top-4 right-4 z-30">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center flex-col gap-0.5">
             <span className="text-[8px] md:text-[10px] font-cinzel uppercase text-white/70">No.</span>
             <span className="text-base md:text-xl font-serif font-bold text-white">{selectedIndex + 1}</span>
          </div>
        </div>

        {/* 클릭 유도 버튼 - 우하단 (더 아래쪽) */}
        <div className="absolute bottom-6 right-6 z-30">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-accent/90 group-hover:bg-accent text-black text-sm font-bold rounded-full shadow-lg shadow-accent/30">
            <Sparkles size={16} />
            <span>자세히 보기</span>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div 
        ref={scrollContainerRef}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        className={cn(
          "flex gap-4 overflow-x-auto scrollbar-hidden pb-4 px-4 select-none pt-2",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
         {celebs.map((celeb, idx) => {
           const isSelected = idx === selectedIndex;
           return (
             <div
               key={celeb.id}
               onClick={() => !hasDragged.current && selectHero(idx)}
               className={cn(
                 "flex-shrink-0 relative w-[120px] md:w-[140px] aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all duration-300",
                 isSelected 
                   ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-main shadow-lg scale-[1.02]"
                   : "opacity-60 hover:opacity-100 hover:-translate-y-1"
               )}
             >
                {celeb.avatar_url ? (
                   <Image
                     src={celeb.avatar_url}
                     alt={celeb.nickname}
                     fill
                     sizes="200px"
                     className="object-cover"
                   />
                ) : (
                   <div className="w-full h-full bg-bg-card flex items-center justify-center text-text-tertiary">
                     <span className="font-serif text-xl">{celeb.nickname[0]}</span>
                   </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-serif font-bold truncate text-center">
                    {celeb.nickname}
                  </p>
                </div>
             </div>
           );
         })}
         
         <Link
            href={`/explore?tagId=${activeTag.id}`}
            className="flex-shrink-0 w-[100px] md:w-[120px] aspect-[3/4] flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 hover:border-accent hover:bg-accent/5 transition-all group"
         >
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-accent group-hover:text-accent">
               <ArrowRight size={14} />
            </div>
            <span className="text-xs text-text-tertiary group-hover:text-accent font-sans">View All</span>
         </Link>
      </div>

      {modalCeleb && (
        <Suspense fallback={null}>
          <CelebDetailModal
            celeb={modalCeleb}
            isOpen={!!modalCeleb}
            onClose={() => setModalCeleb(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
