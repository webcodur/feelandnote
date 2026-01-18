"use client";

import { GreekChevronIcon } from "@/components/ui/icons/neo-pantheon";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ContextHeaderProps {
  title: string;
  subtitle?: string; // e.g., "archive"
  userId: string;
  isOwner?: boolean;
}

export default function ContextHeader({ title, subtitle = "Archive", userId, isOwner }: ContextHeaderProps) {
  return (
    <div className="border-b-[1px] border-accent-dim/30 bg-black/50 backdrop-blur-md pt-8 pb-6 sm:pt-12 sm:pb-10 relative overflow-hidden transition-all duration-300 shadow-xl">
        {/* Decorative Background Element - Subtle Gradient only */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-60" />
        
        {/* Background Embellishment */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[60px] sm:text-[100px] md:text-[150px] font-cinzel text-accent/10 pointer-events-none select-none tracking-[0.4em] font-black uppercase">
          {subtitle}
        </div>

      <div className="container max-w-7xl mx-auto px-4 md:px-8 relative z-10 text-center">

        {/* Breadcrumbs & Title */}
        <div className="inline-flex flex-col items-center">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="h-px w-6 sm:w-10 bg-accent opacity-40" />
            <span className="text-cinzel text-accent-dim text-[10px] sm:text-xs tracking-[0.3em] font-black">THE RECORD OF</span>
            <div className="h-px w-6 sm:w-10 bg-accent opacity-40" />
          </div>
          
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-serif font-bold text-text-primary tracking-tight flex items-center gap-2 sm:gap-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
            <span className="opacity-50"><GreekChevronIcon size={20} className="rotate-180 sm:block hidden" /><GreekChevronIcon size={16} className="rotate-180 sm:hidden" /></span>
            {title}의 기록관
            <span className="opacity-50"><GreekChevronIcon size={20} className="sm:block hidden" /><GreekChevronIcon size={16} className="sm:hidden" /></span>
          </h1>

          <div className="mt-4 sm:mt-5 flex items-center justify-center gap-2 sm:gap-3">
             <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
             <span className="text-serif text-accent text-[10px] sm:text-xs tracking-wider font-bold">공식 기록 증명</span>
             <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
          </div>
        </div>

        {/* Action Buttons (Follow, etc.) */}
        {!isOwner && (
            <div className="mt-6 sm:mt-8">
                <button className="px-6 sm:px-10 py-2 sm:py-3 text-[11px] sm:text-sm border-double border-[3px] sm:border-[4px] border-accent/40 rounded-sm bg-accent/10 hover:bg-accent hover:text-bg-main hover:border-accent text-accent shadow-lg transition-all duration-300 font-serif font-bold tracking-widest">
                  팔로우
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
