"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EXPLORE_PRESETS } from "./constants";

export default function ExploreStackedRowMobile({ section }: { section: typeof EXPLORE_PRESETS[0] }) {
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

         {/* Action Button */}
         <Link
            href={`/explore?${item.query}=${encodeURIComponent(item.value)}`}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20 text-accent active:bg-accent active:text-black z-30"
         >
            <ArrowRight size={10} />
         </Link>
      </div>
    </div>
  );
}
