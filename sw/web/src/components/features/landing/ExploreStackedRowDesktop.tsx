"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXPLORE_PRESETS } from "./constants";

export default function ExploreStackedRowDesktop({ section }: { section: typeof EXPLORE_PRESETS[0] }) {
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
    <div className="flex flex-col gap-3 group/row">
      {/* Category Header */}
      <div className="flex items-center justify-center gap-2 text-accent/80 opacity-70 group-hover/row:opacity-100 transition-opacity">
         <section.icon size={14} />
         <span className="font-serif font-bold text-base text-text-primary">
           {section.label}
         </span>
      </div>

      {/* Stacked Cards */}
      <div 
        className="relative w-full h-[220px] perspective-[1000px] touch-pan-y"
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
              style={{ top: `${offset * 12}px` }}
              className={cn(
                "absolute left-0 w-full h-[180px] p-5 flex flex-col justify-between rounded-xl border transition-all duration-300 ease-out shadow-xl cursor-pointer select-none overflow-hidden",
                "border-white/10 hover:border-accent/30",
                isTop 
                  ? "z-30 opacity-100 scale-100 bg-[#1c1c1e]" 
                  : "z-20 opacity-60 scale-[0.96] bg-[#18181a] pointer-events-none"
              )}
              onClick={() => isTop && handleNext()}
            >
               <div className="absolute inset-0 bg-[url('/images/black-linen.png')] opacity-40 pointer-events-none" />

               <div className="relative z-10 text-center flex flex-col items-center justify-center h-full gap-2">
                  <span className="font-cinzel text-[10px] text-accent/60 uppercase tracking-widest">
                    {section.sub}
                  </span>
                  <div>
                    <h5 className="font-cinzel text-xl md:text-2xl font-bold text-zinc-100 leading-none tracking-wide mb-1">
                      {item.label}
                    </h5>
                    <p className="text-xs text-zinc-400 font-serif font-medium">
                       {item.sub}
                    </p>
                  </div>
               </div>

               {isTop && (
                 <Link
                    href={`/explore?${item.query}=${encodeURIComponent(item.value)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 right-3 p-2 rounded-full bg-white/10 border border-white/20 text-white opacity-0 group-hover/row:opacity-100 hover:bg-accent hover:text-black hover:border-accent transition-all z-20"
                    aria-label="탐색 페이지로 이동"
                 >
                   <ArrowRight size={14} />
                 </Link>
               )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
