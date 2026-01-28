"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Briefcase, Globe, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";

// #region Data (Shared Constants)
export const EXPLORE_PRESETS = [
  {
    id: "profession",
    label: "직업으로 탐색",
    sub: "By Profession",
    icon: Briefcase,
    items: [
      { label: "Leader", sub: "지도자", value: "leader", query: "profession" },
      { label: "Politician", sub: "정치인", value: "politician", query: "profession" },
      { label: "Commander", sub: "지휘관", value: "commander", query: "profession" },
      { label: "Entrepreneur", sub: "기업가", value: "entrepreneur", query: "profession" },
      { label: "Investor", sub: "투자자", value: "investor", query: "profession" },
      { label: "Scholar", sub: "학자", value: "scholar", query: "profession" },
      { label: "Artist", sub: "예술인", value: "artist", query: "profession" },
      { label: "Author", sub: "작가", value: "author", query: "profession" },
      { label: "Actor", sub: "배우", value: "actor", query: "profession" },
      { label: "Influencer", sub: "인플루엔서", value: "influencer", query: "profession" },
      { label: "Athlete", sub: "스포츠인", value: "athlete", query: "profession" },
    ]
  },
  {
    id: "nationality",
    label: "국가로 탐색",
    sub: "By Nationality",
    icon: Globe,
    items: [
      { label: "South Korea", sub: "대한민국", value: "KR", query: "nationality" },
      { label: "USA", sub: "미국", value: "US", query: "nationality" },
      { label: "UK", sub: "영국", value: "GB", query: "nationality" },
      { label: "France", sub: "프랑스", value: "FR", query: "nationality" },
      { label: "Germany", sub: "독일", value: "DE", query: "nationality" },
    ]
  },
  {
    id: "content",
    label: "콘텐츠로 탐색",
    sub: "By Collection",
    icon: Award,
    items: [
      { label: "Books", sub: "도서", value: "BOOK", query: "contentType" },
      { label: "Videos", sub: "영상", value: "VIDEO", query: "contentType" },
      { label: "Games", sub: "게임", value: "GAME", query: "contentType" },
      { label: "Music", sub: "음악", value: "MUSIC", query: "contentType" },
    ]
  }
];
// #endregion

interface FeaturedCollectionsDesktopProps {
  tags: FeaturedTag[];
  activeTagIndex: number;
  setActiveTagIndex: (index: number) => void;
}

export default function FeaturedCollectionsDesktop({ 
  tags, 
  activeTagIndex, 
  setActiveTagIndex 
}: FeaturedCollectionsDesktopProps) {
  
  const activeTag = tags.length > 0 ? tags[activeTagIndex] : null;

  return (
    <div className="w-full flex flex-col gap-8 md:gap-12">
      
      {/* 2026.01 Refined Header: "EXPLORE PARENT" */}
      <div className="flex flex-col items-start justify-center text-left px-1">
        <div className="flex items-center gap-3 mb-2 opacity-60">
           <span className="font-cinzel text-[10px] md:text-xs text-accent tracking-[0.3em] uppercase">
             Explore Wisdom
           </span>
           <div className="h-px w-12 bg-accent/30" />
        </div>
        <h2 className="font-serif font-black text-3xl md:text-4xl text-text-primary mb-2">
          영감의 탐험
        </h2>
        <p className="font-sans text-text-secondary text-sm md:text-[15px] max-w-3xl keep-all leading-relaxed text-balance opacity-80 mt-1">
          시대를 초월한 지성을 만나는 여정. <br className="hidden md:block" />
          깊이 있는 <b>큐레이션</b>으로 몰입하거나, 다양한 <b>카테고리</b>로 폭넓게 탐색해보세요.
        </p>
      </div>
      
      {/* Split Layout (12-Col Grid) with Vertical Divider */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative">
        
        {/* Left Column (Main) - Curated Exhibition (Span 8) */}
        <div className="w-full lg:col-span-8 flex flex-col relative">
           {/* Section Header */}
           <div className="flex items-center gap-2 mb-6 opacity-90">
             <div className="w-1 h-4 bg-accent" />
             <h3 className="font-cinzel font-bold text-lg md:text-xl text-text-primary tracking-wider">
               Curated Exhibition
             </h3>
           </div>

           {activeTag ? (
             <CuratedExhibition 
               key={activeTag.id}
               activeTag={activeTag} 
               tags={tags} 
               activeIndex={activeTagIndex} 
               onTagChange={setActiveTagIndex} 
             />
           ) : (
             <div className="w-full h-96 flex items-center justify-center border border-dashed border-border rounded-2xl bg-bg-card/30">
               <span className="text-text-tertiary font-serif italic">진행 중인 기획전이 없습니다.</span>
             </div>
           )}

           {/* Vertical Divider (Visual Only - Centered in Gap) */}
           <div className="hidden lg:block absolute -right-6 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        {/* Right Column (Side) - Quick Browse (Span 4) */}
        <div className="w-full lg:col-span-4 flex flex-col gap-10 sticky top-8">
           {/* Section Header */}
           <div className="flex items-center gap-2 mb-[-1rem] opacity-90">
             <div className="w-1 h-4 bg-text-tertiary" />
             <h3 className="font-cinzel font-bold text-lg md:text-xl text-text-secondary tracking-wider">
               Quick Browse
             </h3>
           </div>
          
           {EXPLORE_PRESETS.map((section) => (
            <ExploreStackedRow key={section.id} section={section} />
           ))}
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="flex justify-center mt-4 md:mt-6">
        <Link
          href="/explore"
          className="group relative px-8 py-4 bg-transparent border border-accent/20 rounded-full overflow-hidden hover:border-accent/60 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-accent/5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
          <span className="relative flex items-center gap-3 font-cinzel font-bold text-accent text-sm tracking-widest">
            <Globe size={18} />
            EXPLORE ALL FIGURES
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>
    </div>
  );
}

// #region Sub-components (Desktop)

interface CuratedExhibitionProps {
  activeTag: FeaturedTag;
  tags: FeaturedTag[];
  activeIndex: number;
  onTagChange: (index: number) => void;
}

function CuratedExhibition({ activeTag, tags, activeIndex, onTagChange }: CuratedExhibitionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);
  const [heroKey, setHeroKey] = useState(0); 

  // Refs & Drags
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);
  const hasDragged = useRef(false);

  const celebs = activeTag.celebs;
  const heroCeleb = celebs[selectedIndex];
  
  // Handlers
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

  const selectHero = (idx: number) => {
    if (idx !== selectedIndex) {
      setSelectedIndex(idx);
      setHeroKey(p => p + 1);
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

      {/* Hero Card */}
      <div 
        key={heroKey}
        onClick={() => heroCeleb && setModalCeleb(heroCeleb)}
        className="group relative w-full aspect-[4/5] md:aspect-[16/11] overflow-hidden rounded-[4px] cursor-pointer bg-[#0a0a0a] shadow-2xl animate-hero-fade-in"
      >
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        
        <div className="absolute inset-0 flex flex-col md:flex-row">
            {/* Left Content */}
            <div className="relative z-20 flex-1 p-6 md:p-10 flex flex-col justify-center order-2 md:order-1 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/90 to-transparent">
                <div className="w-12 h-1 bg-accent mb-6 md:mb-8 shadow-[0_0_15px_rgba(212,175,55,0.4)]" />

                <div className="flex flex-col gap-1 mb-5">
                  {heroCeleb?.title && (
                    <span className="text-sm md:text-base text-accent font-serif font-bold tracking-wider leading-snug">
                      {heroCeleb.title}
                    </span>
                  )}
                  
                  <h3 className="text-2xl md:text-4xl font-serif font-black text-white leading-tight tracking-tight">
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
            <div className="relative w-full md:w-[45%] h-[60%] md:h-full order-1 md:order-2 overflow-hidden">
               <div className="absolute inset-0 transform group-hover:scale-105 transition-transform duration-700 ease-in-out">
                 {heroCeleb?.portrait_url || heroCeleb?.avatar_url ? (
                    <Image
                      src={heroCeleb.portrait_url || heroCeleb.avatar_url!}
                      alt={heroCeleb.nickname}
                      fill
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

        <div className="absolute top-4 right-4 z-30">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/10 bg-black/20 backdrop-blur-md flex items-center justify-center flex-col gap-0.5 group-hover:bg-accent group-hover:text-black transition-all duration-500">
             <span className="text-[8px] md:text-[10px] font-cinzel uppercase">No.</span>
             <span className="text-base md:text-xl font-serif font-bold">{selectedIndex + 1}</span>
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
        <CelebDetailModal
          celeb={modalCeleb}
          isOpen={!!modalCeleb}
          onClose={() => setModalCeleb(null)}
        />
      )}
    </div>
  );
}

function ExploreStackedRow({ section }: { section: typeof EXPLORE_PRESETS[0] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % section.items.length); 
  };

  const onDragStart = (clientX: number) => {
    dragStartX.current = clientX;
  };

  const onDragEnd = (clientX: number) => {
    if (dragStartX.current === null) return;
    const diff = dragStartX.current - clientX;
    
    if (diff > 50) {
      handleNext();
    }
    dragStartX.current = null;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5 px-1">
        <div className="flex items-center gap-2 text-accent opacity-80">
           <section.icon size={12} />
           <span className="text-[10px] font-cinzel tracking-widest uppercase">{section.sub}</span>
        </div>
        <h4 className="font-serif font-bold text-lg text-text-primary">
           {section.label}
        </h4>
      </div>

      <div 
        className="relative w-full h-[180px] perspective-[1000px] touch-pan-y"
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseUp={(e) => onDragEnd(e.clientX)}
        onMouseLeave={(e) => onDragEnd(e.clientX)}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchEnd={(e) => onDragEnd(e.changedTouches[0].clientX)}
      >
        {[2, 1, 0].map((offset) => {
          const itemIndex = (activeIndex + offset) % section.items.length;
          const item = section.items[itemIndex];
          const isTop = offset === 0;
          
          return (
            <div
              key={`${item.value}-${itemIndex}`}
              className={cn(
                "absolute top-0 h-full p-6 flex flex-col justify-between rounded-xl border transition-all duration-300 ease-out shadow-2xl cursor-pointer select-none overflow-hidden bg-[#1c1c1e]",
                "border-white/10 hover:border-accent/20",
                isTop 
                  ? "z-30 left-0 w-[90%] opacity-100 scale-100 shadow-2xl bg-[#1c1c1e]" 
                  : offset === 1 
                    ? "z-20 left-4 w-[90%] opacity-60 scale-95 brightness-75 bg-[#18181a]" 
                    : "z-10 left-8 w-[90%] opacity-30 scale-90 brightness-50 bg-[#141416]"
              )}
              onClick={() => isTop && handleNext()}
            >
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-40 pointer-events-none" />

               <div className="relative z-10 flex items-start justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border border-white/15 text-accent shadow-inner">
                         {section.id === 'profession' && <Briefcase size={20} />}
                         {section.id === 'nationality' && <Globe size={20} />}
                         {section.id === 'content' && <Award size={20} />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="font-cinzel text-[10px] text-accent/60 uppercase tracking-[0.2em]">
                          {section.sub}
                        </span>
                        <h5 className="font-cinzel text-2xl font-bold text-zinc-100 leading-none tracking-wide">
                          {item.label}
                        </h5>
                        <p className="text-sm text-zinc-400 font-serif font-medium mt-0.5">
                           {item.sub}
                        </p>
                    </div>
                  </div>
                  
                  {isTop && (
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-black/20">
                       <span className="font-cinzel text-[10px] text-accent/50">{itemIndex + 1}</span>
                    </div>
                  )}
               </div>

               <div className="relative z-10 flex items-center justify-end mt-auto pt-4 border-t border-white/5">
                   <Link
                      href={`/explore?${item.query}=${encodeURIComponent(item.value)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="group/btn flex items-center gap-2 text-xs font-bold text-accent px-3 py-1.5 rounded-full bg-accent/5 hover:bg-accent/10 transition-colors"
                   >
                     EXPLORE COLLECTION
                     <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                   </Link>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// #endregion
