"use client";

import { useState, useRef, lazy, Suspense, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import type { ExhibitionLocation } from "./FeaturedCollections";

const CelebDetailModal = lazy(() => import("@/components/features/home/celeb-card-drafts/CelebDetailModal"));

interface CuratedExhibitionDesktopProps {
  activeTag: FeaturedTag;
  tags: FeaturedTag[];
  activeIndex: number;
  onTagChange: (index: number) => void;
  location?: Exclude<ExhibitionLocation, "explore-mb">;
}

export default function CuratedExhibitionDesktop({ activeTag, tags, activeIndex, onTagChange, location = "main" }: CuratedExhibitionDesktopProps) {
  const isExplore = location === "explore-pc";
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);
  const [modalCelebIndex, setModalCelebIndex] = useState(-1);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  // Transition State
  const [renderedTag, setRenderedTag] = useState(activeTag);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (activeTag.id !== renderedTag.id) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setRenderedTag(activeTag);
        setSelectedIndex(0);
        setIsTransitioning(false);
      }, 300); // fade-out duration
      return () => clearTimeout(timer);
    }
  }, [activeTag, renderedTag]);

  // Refs & Drags (하단 리스트용) - 간소화된 구현
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  // Hero Card 드래그 (인물 전환용)
  const heroDragStartX = useRef(0);
  const heroDragStartY = useRef(0);
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const heroHasDragged = useRef(false);

  const celebs = renderedTag.celebs;
  const heroCeleb = celebs[selectedIndex];
  const SWIPE_THRESHOLD = 30; // 스와이프 감도 향상
  const CLICK_THRESHOLD = 8; // 이 이하면 클릭으로 판정

  // 드래그 방향에 따른 다음/이전 인물
  const canGoNext = selectedIndex < celebs.length - 1;
  const canGoPrev = selectedIndex > 0;

  // 하단 리스트 Pointer Handlers
  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    dragState.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
    };
    el.style.cursor = "grabbing";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollContainerRef.current;
    if (!el || !dragState.current.isDown) return;

    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;

    // 드래그 의도 확정 전 (15px 미만): 아무것도 안 함
    if (!dragState.current.hasMoved) {
      if (Math.abs(walk) > 15) {
        // 드래그 시작 확정 - 현재 위치를 새 기준점으로 설정
        dragState.current.hasMoved = true;
        dragState.current.startX = x;
        dragState.current.scrollLeft = el.scrollLeft;
      }
      return;
    }

    // 드래그 중: 스크롤 이동
    e.preventDefault();
    const newWalk = x - dragState.current.startX;
    el.scrollLeft = dragState.current.scrollLeft - newWalk;
  };

  const onPointerUp = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    dragState.current.isDown = false;
    el.style.cursor = "grab";
  };

  const onPointerLeave = () => {
    if (scrollContainerRef.current) {
      dragState.current.isDown = false;
      dragState.current.hasMoved = false;
      scrollContainerRef.current.style.cursor = "grab";
    }
  };

  // Hero Card 드래그 Handlers
  const handleHeroDragStart = (clientX: number, clientY: number) => {
    setIsHeroDragging(true);
    heroHasDragged.current = false;
    heroDragStartX.current = clientX;
    heroDragStartY.current = clientY;
    setDragOffset(0);
  };

  const handleHeroDragMove = (clientX: number, clientY: number) => {
    if (!isHeroDragging) return;
    const diffX = clientX - heroDragStartX.current;
    const diffY = clientY - heroDragStartY.current;
    // 끝에서는 저항감 추가
    const resistance = (!canGoPrev && diffX > 0) || (!canGoNext && diffX < 0) ? 0.3 : 1;
    setDragOffset(diffX * resistance);
    // X 또는 Y 방향으로 일정 이상 움직이면 드래그로 판정
    if (Math.abs(diffX) > CLICK_THRESHOLD || Math.abs(diffY) > CLICK_THRESHOLD) {
      heroHasDragged.current = true;
    }
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
      const scrollPos = scrollContainerRef.current?.scrollLeft ?? 0;
      setSelectedIndex(idx);
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollPos;
        }
      });
    }
  };

  // #region 공통 서브 컴포넌트
  const TagButtons = () => (
    <div className="flex flex-wrap gap-2">
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
  );

  const CelebThumbnails = () => (
    <div
      ref={scrollContainerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className={cn(
        "flex overflow-x-auto scrollbar-hidden select-none cursor-grab touch-pan-x",
        isExplore ? "gap-4 py-3 px-1" : "gap-4 pb-4 px-4 pt-2"
      )}
    >
      {celebs.map((celeb, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={celeb.id}
            onClick={() => {
              if (!dragState.current.hasMoved) selectHero(idx);
              dragState.current.hasMoved = false;
            }}
            className={cn(
              "flex-shrink-0 relative w-[100px] md:w-[120px] aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all duration-300",
              isSelected
                ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-main shadow-lg scale-[1.02]"
                : "opacity-60 hover:opacity-100 hover:-translate-y-1"
            )}
          >
            {celeb.avatar_url ? (
              <Image src={celeb.avatar_url} alt={celeb.nickname} fill sizes="150px" className="object-cover" />
            ) : (
              <div className="w-full h-full bg-bg-card flex items-center justify-center text-text-tertiary">
                <span className="font-serif text-xl">{celeb.nickname[0]}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col items-center justify-end pb-1 pt-4 px-2">
              {celeb.title && (
                <span className="text-[10px] font-cinzel font-bold text-amber-500 tracking-widest uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] break-keep leading-tight">
                  {celeb.title}
                </span>
              )}
              <span className="text-[11px] font-sans font-bold text-white tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate w-full text-center">
                {celeb.nickname}
              </span>
            </div>
          </div>
        );
      })}
      {!isExplore && (
        <Link
          href={`/explore?tagId=${activeTag.id}`}
          className="flex-shrink-0 w-[80px] md:w-[100px] aspect-[3/4] flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 hover:border-accent hover:bg-accent/5 transition-all group"
        >
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-accent group-hover:text-accent">
            <ArrowRight size={14} />
          </div>
          <span className="text-xs text-text-tertiary group-hover:text-accent font-sans">View All</span>
        </Link>
      )}
    </div>
  );
  // #endregion

  // #region explore-pc 전용 2열 레이아웃
  if (isExplore) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-8 overflow-hidden">
        {/* 좌측 열: Hero Card + 썸네일 배열 */}
        <div 
          className={cn(
            "flex flex-col gap-6 min-w-0 transition-all duration-300 ease-in-out",
            isTransitioning ? "opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
          )}
        >
          {/* Hero Card (이미지 + 정보 포함) */}
          <div
            className={cn(
              "group relative w-full aspect-[16/9] overflow-hidden rounded-lg bg-[#0a0a0a] shadow-xl select-none",
              isHeroDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={(e) => handleHeroDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleHeroDragMove(e.clientX, e.clientY)}
            onMouseUp={handleHeroDragEnd}
            onMouseLeave={handleHeroDragEnd}
            onClick={() => !heroHasDragged.current && heroCeleb && (() => { setModalCeleb(heroCeleb); setModalCelebIndex(selectedIndex); })()}
          >
            <div
              key={selectedIndex}
              className={cn(
                "absolute inset-0 flex",
                slideDirection === "left" && "animate-slide-in-right",
                slideDirection === "right" && "animate-slide-in-left"
              )}
              style={{
                transform: isHeroDragging ? `translateX(${dragOffset * 0.3}px)` : undefined,
                opacity: isHeroDragging ? 1 - Math.abs(dragOffset) * 0.002 : 1,
              }}
            >
              {/* 텍스트 영역 */}
              <div className="relative z-20 flex-1 p-8 flex flex-col justify-center items-start bg-gradient-to-r from-black via-black/90 to-transparent">
                <div className="flex flex-col gap-3">
                  {/* Title + Name */}
                  <div className="flex flex-col gap-2">
                    {heroCeleb?.title && (
                      <span className="text-xs text-accent font-serif font-bold tracking-wider">{heroCeleb.title}</span>
                    )}
                    <h3 className="text-2xl font-serif font-black text-white leading-tight">{heroCeleb?.nickname}</h3>
                  </div>

                  {/* Short Description */}
                  {heroCeleb?.short_desc && (
                    <p className="text-lg text-white/90 font-serif italic leading-relaxed">"{heroCeleb.short_desc}"</p>
                  )}

                  {/* Long Description */}
                  {heroCeleb?.long_desc && (
                    <p className="text-sm text-text-secondary font-sans leading-relaxed break-keep line-clamp-3">{heroCeleb.long_desc}</p>
                  )}
                </div>
              </div>

              {/* 이미지 영역 */}
              <div className="relative w-[35%] h-full overflow-hidden">
                {heroCeleb?.portrait_url || heroCeleb?.avatar_url ? (
                  <Image
                    src={heroCeleb.portrait_url || heroCeleb.avatar_url!}
                    alt={heroCeleb.nickname}
                    fill
                    sizes="400px"
                    priority={selectedIndex === 0}
                    className="object-cover object-center filter brightness-[0.9] group-hover:brightness-100 transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                    <span className="text-6xl text-white/5 font-serif font-black">{heroCeleb?.nickname?.[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/50" />
              </div>
            </div>

            {/* 넘버 뱃지 */}
            <div className="absolute top-4 right-4 z-30">
              <div className="w-12 h-12 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center flex-col gap-0.5">
                <span className="text-[8px] font-cinzel uppercase text-white/70">No.</span>
                <span className="text-base font-serif font-bold text-white">{selectedIndex + 1}</span>
              </div>
            </div>

            {/* 스와이프 인디케이터 - 하단 중앙 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
              {celebs.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    idx === selectedIndex ? "bg-accent w-4" : "bg-white/30"
                  )}
                />
              ))}
            </div>
          </div>

          {/* 인물 배열 썸네일 */}
          <CelebThumbnails />
        </div>

        {/* 우측 열: 컬렉션 네비게이션 */}
        <div className="relative min-h-[400px]"> {/* min-h로 최소 높이 보장 */}
          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-r-xl bg-gradient-to-b from-white/[0.02] to-transparent">
          
            {/* 장식용 배경 요소 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/5 blur-[50px] pointer-events-none" />

            {/* 헤더 영역 */}
            <div className="flex flex-col items-center justify-center pt-7 pb-5 px-5 text-center border-b border-white/5 relative z-10 shrink-0">
              <div className="flex items-center gap-3 mb-2 opacity-60">
                <div className="h-[1px] w-6 bg-gradient-to-l from-white to-transparent" />
                <span className="text-[10px] text-[#d4af37] font-cinzel font-bold uppercase tracking-[0.2em]">Exhibitions</span>
                <div className="h-[1px] w-6 bg-gradient-to-r from-white to-transparent" />
              </div>
              
              <h2 className={cn(
                "text-2xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/70 leading-tight mb-3 transition-opacity duration-300 delay-75",
                isTransitioning ? "opacity-0" : "opacity-100"
              )}>
              {renderedTag.name}
            </h2>
            
            <div className="h-[3.2em] flex items-center justify-center w-full">
              <p className={cn(
                  "text-[13px] text-text-secondary/80 leading-relaxed font-sans line-clamp-2 px-2 transition-opacity duration-300 delay-100",
                  isTransitioning ? "opacity-0" : "opacity-100"
                )}>
                {renderedTag.description || "역사 속 위인들의 콘텐츠 여정을 탐험해보세요."}
              </p>
            </div>
            </div>

            {/* 리스트 영역 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5">
              {tags.map((tag, idx) => {
                const isActive = activeIndex === idx;
                const isUpcoming = !tag.is_featured;

                return (
                  <button
                    key={tag.id}
                    onClick={() => !isUpcoming && onTagChange(idx)}
                    disabled={isUpcoming}
                    className={cn(
                      "group relative w-full px-3 py-3.5 flex items-center gap-3 rounded-lg transition-all duration-300 border text-left shrink-0", 
                      isActive
                        ? "bg-[#d4af37]/10 border-[#d4af37]/40 shadow-[0_0_15px_-5px_#d4af37] z-10"
                        : isUpcoming
                          ? "bg-transparent border-transparent opacity-40 cursor-not-allowed grayscale"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20 hover:translate-x-1"
                    )}
                  >
                    {/* Active Indicator Line */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-[3px] bg-[#d4af37] shadow-[2px_0_8px_#d4af37] rounded-r-full" />
                    )}

                    {/* Numbering */}
                    <span className={cn(
                      "text-xs font-cinzel font-bold w-6 text-right transition-colors",
                      isActive ? "text-[#d4af37]" : "text-white/20 group-hover:text-white/40"
                    )}>
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>

                    {/* Title */}
                    <span className={cn(
                      "flex-1 text-[15px] font-serif tracking-wide transition-colors line-clamp-1",
                      isActive ? "text-white font-bold" : "text-text-secondary group-hover:text-white"
                    )}>
                      {tag.name}
                    </span>

                    {/* Status Icon */}
                    {isUpcoming && <span className="text-[10px] uppercase font-sans tracking-wide border border-white/20 px-1.5 py-[1px] rounded text-white/40">Open Soon</span>}
                    
                    {/* Arrow for Active/Hover */}
                    {!isUpcoming && (
                       <ArrowRight 
                         size={14} 
                         className={cn(
                           "transition-all duration-300 flex-shrink-0",
                           isActive ? "text-[#d4af37] opacity-100 translate-x-0" : "text-white/30 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                         )} 
                       />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* 하단 페이드 */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black to-transparent pointer-events-none" />
          </div>
        </div>

        {modalCeleb && (
          <Suspense fallback={null}>
            <CelebDetailModal
              celeb={modalCeleb}
              isOpen={!!modalCeleb}
              onClose={() => { setModalCeleb(null); setModalCelebIndex(-1); }}
              onNavigate={(dir) => {
                const idx = dir === "prev" ? modalCelebIndex - 1 : modalCelebIndex + 1;
                if (idx >= 0 && idx < celebs.length) { setModalCelebIndex(idx); setModalCeleb(celebs[idx]); }
              }}
              hasPrev={modalCelebIndex > 0}
              hasNext={modalCelebIndex < celebs.length - 1}
            />
          </Suspense>
        )}
      </div>
    );
  }
  // #endregion

  // #region main 기본 레이아웃 (수직 배치)
  return (
    <div className="flex flex-col gap-6">

      {/* Tags */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
        <TagButtons />
      </div>

      {/* Tag Description - 수식어 */}
      <div className="animate-fade-in pl-1 mt-1">
         <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep opacity-90 max-w-4xl">
           {renderedTag.description || "역사 속 위인들의 콘텐츠 여정을 탐험해보세요."}
         </p>
      </div>

      {/* Hero Card - 전체 영역 클릭 시 모달 오픈, 좌우 드래그 시 인물 전환 */}
      <div
        className={cn(
          "group relative w-full aspect-[4/5] md:aspect-[16/7] overflow-hidden rounded-[4px] bg-[#0a0a0a] shadow-2xl select-none transition-all duration-300",
          isHeroDragging ? "cursor-grabbing" : "cursor-grab",
          isTransitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
        )}
        onMouseDown={(e) => handleHeroDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleHeroDragMove(e.clientX, e.clientY)}
        onMouseUp={handleHeroDragEnd}
        onMouseLeave={handleHeroDragEnd}
        onClick={() => !heroHasDragged.current && heroCeleb && (() => { setModalCeleb(heroCeleb); setModalCelebIndex(selectedIndex); })()}
      >
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

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
            {/* Left Content - 텍스트 영역 */}
            <div className="relative z-20 flex-1 p-6 md:p-10 flex flex-col justify-center items-start order-2 md:order-1 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/90 to-transparent">
                <div className="flex flex-col gap-3 max-w-xl">
                  {/* Title + Name */}
                  <div className="flex flex-col gap-2">
                    {heroCeleb?.title && (
                      <span className="text-xs md:text-sm text-accent font-serif font-bold tracking-wider leading-snug">
                        {heroCeleb.title}
                      </span>
                    )}
                    <h3 className="text-lg md:text-2xl font-serif font-black text-white leading-tight tracking-tight">
                      {heroCeleb?.nickname}
                    </h3>
                  </div>

                  {/* Short Description */}
                  {heroCeleb?.short_desc && (
                    <p className="text-lg md:text-xl text-white font-serif font-bold italic leading-relaxed text-balance opacity-90">
                      "{heroCeleb.short_desc}"
                    </p>
                  )}

                  {/* Long Description */}
                  {heroCeleb?.long_desc && (
                    <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep opacity-80 line-clamp-4">
                      {heroCeleb.long_desc}
                    </p>
                  )}
                </div>
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
        <div className="absolute top-3 right-3 z-30">
          <div className="w-11 h-11 md:w-14 md:h-14 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center flex-col gap-0">
             <span className="text-[7px] md:text-[9px] font-cinzel uppercase text-white/70">No.</span>
             <span className="text-sm md:text-lg font-serif font-bold text-white">{selectedIndex + 1}</span>
          </div>
        </div>

        {/* 스와이프 인디케이터 - 하단 중앙 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
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

      </div>

      {/* Grid Content - 썸네일 리스트 */}
      <CelebThumbnails />

      {modalCeleb && (
        <Suspense fallback={null}>
          <CelebDetailModal
            celeb={modalCeleb}
            isOpen={!!modalCeleb}
            onClose={() => { setModalCeleb(null); setModalCelebIndex(-1); }}
            onNavigate={(dir) => {
              const idx = dir === "prev" ? modalCelebIndex - 1 : modalCelebIndex + 1;
              if (idx >= 0 && idx < celebs.length) { setModalCelebIndex(idx); setModalCeleb(celebs[idx]); }
            }}
            hasPrev={modalCelebIndex > 0}
            hasNext={modalCelebIndex < celebs.length - 1}
          />
        </Suspense>
      )}
    </div>
  );
}
