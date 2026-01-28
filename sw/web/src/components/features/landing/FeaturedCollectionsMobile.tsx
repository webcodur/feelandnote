"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Globe, Briefcase, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
// Import shared constants from Desktop if possible, or redefine here.
// For now, I'll redefine to be safe and independent.
import { EXPLORE_PRESETS } from "./FeaturedCollectionsDesktop";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";

interface FeaturedCollectionsMobileProps {
  tags: FeaturedTag[];
  activeTagIndex: number;
  setActiveTagIndex: (index: number) => void;
}

export default function FeaturedCollectionsMobile({
  tags,
  activeTagIndex,
  setActiveTagIndex
}: FeaturedCollectionsMobileProps) {
  
  const activeTag = tags.length > 0 ? tags[activeTagIndex] : null;
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);

  return (
    <div className="w-full flex flex-col gap-10 pb-10">
      
      {/* 1. Header (Simplfied for Mobile) */}
      <div className="flex flex-col items-start px-2">
         <span className="font-cinzel text-[10px] text-accent tracking-[0.3em] uppercase mb-2 opacity-80">
           Explore Wisdom
         </span>
         <h2 className="font-serif font-black text-2xl text-text-primary mb-2">
           영감의 탐험
         </h2>
         <p className="font-sans text-text-secondary text-sm leading-relaxed opacity-80">
           역사 속 위인들의 지혜를 탐험하세요.
         </p>
      </div>

      {/* 2. Curated Exhibition (Horizontal Sticky Tabs) */}
      <div className="w-full">
         <div className="flex overflow-x-auto scrollbar-hidden px-2 mb-4 border-b border-white/5 pb-2 sticky top-0 z-40 bg-bg-main/95 backdrop-blur-sm">
           <div className="flex gap-2">
             {tags.map((tag, idx) => {
               const isActive = activeTagIndex === idx;
               return (
                 <button
                   key={tag.id}
                   onClick={() => setActiveTagIndex(idx)}
                   className={cn(
                     "whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full transition-all",
                     isActive 
                       ? "bg-accent text-bg-main font-bold shadow-lg shadow-accent/20" 
                       : "bg-white/5 text-text-tertiary border border-white/10"
                   )}
                 >
                   {tag.name}
                 </button>
               );
             })}
           </div>
         </div>

         {/* Mobile Hero Card (Vertical Focus) & List - Refactored to Sub-component */}
         {activeTag && (
           <MobileCuratedExhibition 
              key={activeTag.id}
              activeTag={activeTag}
              onCelebClick={(celeb) => setModalCeleb(celeb)}
           />
         )}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-white/5 my-2" />

      {/* 3. Quick Browse (Interactive 3-Column Decks) */}
      <div className="flex flex-col gap-3 px-2">
         <div className="flex items-center gap-2 opacity-80 mb-1">
           <div className="w-1 h-3 bg-text-tertiary" />
           <h3 className="font-cinzel font-bold text-lg text-text-secondary">Quick Browse</h3>
         </div>
         
         {/* 3 Columns Grid */}
         <div className="grid grid-cols-3 gap-3">
            {EXPLORE_PRESETS.map((section) => (
              <MobileStackWidget key={section.id} section={section} />
            ))}
         </div>
      </div>

      {/* Mobile CTA */}
      <Link
        href="/explore"
        className="mx-2 mt-6 py-4 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center gap-2 text-accent font-cinzel font-bold text-sm"
      >
        <Globe size={16} />
        EXPLORE ALL
      </Link>
      
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

// Sub-component for Mobile Curated Exhibition (Select-to-View Logic)
interface MobileCuratedExhibitionProps {
  activeTag: FeaturedTag;
  onCelebClick: (celeb: FeaturedCeleb) => void;
}

function MobileCuratedExhibition({ activeTag, onCelebClick }: MobileCuratedExhibitionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const heroCeleb = activeTag.celebs[selectedIndex];

  return (
    <>
      {/* Hero Card */}
      <div className="px-4 py-8 mb-4">
         <div 
           className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-neutral-900"
           onClick={() => onCelebClick(heroCeleb)}
         >
            {heroCeleb.portrait_url || heroCeleb.avatar_url ? (
              <Image
                src={heroCeleb.portrait_url || heroCeleb.avatar_url!}
                alt={heroCeleb.nickname}
                fill
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

            {/* Badge removed as requested */}
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

// Sub-component for Mobile Stack Interaction
function MobileStackWidget({ section }: { section: typeof EXPLORE_PRESETS[0] }) {
  const [index, setIndex] = useState(0);
  const item = section.items[index];

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % section.items.length);
  };

  return (
    <div className="relative h-32 w-full select-none" onClick={handleNext}>
      {/* Background Stack Effect */}
      <div className="absolute top-2 left-2 right-[-4px] bottom-[-4px] bg-white/5 rounded-xl border border-white/5 z-0" />
      <div className="absolute top-1 left-1 right-[-2px] bottom-[-2px] bg-white/10 rounded-xl border border-white/5 z-10" />

      {/* Main Card */}
      <div className="relative h-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 flex flex-col justify-between z-20 transition-colors shadow-lg cursor-pointer overflow-hidden active:bg-white/10">
         
         {/* Context Guide */}
         <div className="flex items-center gap-1.5 opacity-60">
            <section.icon size={10} />
            <span className="text-[9px] font-cinzel uppercase tracking-wider truncate">{section.sub.split(' ')[1] || section.sub}</span>
         </div>

         {/* Content with Animation */}
         <div key={index} className="flex flex-col gap-0.5 mt-1 animate-in fade-in slide-in-from-right-4 duration-300">
            <span className="font-serif text-[13px] font-bold text-white leading-tight break-words line-clamp-2 min-h-[2.4em]">
              {item.label}
            </span>
            <span className="text-[10px] text-text-tertiary truncate">
              {item.sub}
            </span>
         </div>

         {/* Action Button (Routing) */}
         <div className="flex justify-end mt-1">
            <Link
               href={`/explore?${item.query}=${encodeURIComponent(item.value)}`}
               onClick={(e) => e.stopPropagation()} 
               className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20 text-accent hover:bg-accent hover:text-black transition-colors"
            >
               <ArrowRight size={10} />
            </Link>
         </div>
      </div>
    </div>
  );
}
