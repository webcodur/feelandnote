/*
  파일명: /components/features/user/flows/FlowCard.tsx
  기능: 플로우 카드 컴포넌트
  책임: 플로우의 메타데이터를 "고대 석판" 컨셉으로 시각화한다.
*/
"use client";

import Image from "next/image";
import { Layers, ChevronRight, Lock } from "lucide-react";
import type { FlowSummary } from "@/types/database";
import { BLUR_DATA_URL } from "@/constants/image";

interface FlowCardProps {
  flow: FlowSummary;
  onClick: () => void;
  className?: string;
}

export default function FlowCard({ flow, onClick, className = "" }: FlowCardProps) {
  // 첫 번째 스테이지의 첫 번째 노드 썸네일
  const thumbnailUrl = flow.stages?.[0]?.nodes?.[0]?.content?.thumbnail_url;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col w-full h-full bg-[#1a1a1a] border border-accent/30 hover:border-accent transition-all duration-500 overflow-hidden ${className}`}
    >
      {/* Background Texture & Gradient */}
      <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80 pointer-events-none" />

      {/* Frame Decor */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

      {/* Image Area (Showcase) */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#111]">
         {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={flow.name}
              fill
              unoptimized
              className="object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
               <Layers size={64} className="text-accent" strokeWidth={1} />
            </div>
          )}
          
          {/* Node Count Badge */}
          <div className="absolute top-2 right-2 md:top-3 md:right-3 px-1.5 md:px-2 py-0.5 md:py-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded flex items-center gap-1 md:gap-1.5 z-10">
            <Layers size={10} className="text-accent md:hidden" />
            <Layers size={12} className="text-accent hidden md:block" />
            <span className="text-[9px] md:text-[10px] font-serif font-bold text-white/90 tracking-wide">
              {flow.node_count}
            </span>
          </div>

          {!flow.is_public && (
            <div className="absolute top-2 left-2 md:top-3 md:left-3 px-1.5 md:px-2 py-0.5 md:py-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded flex items-center gap-1.5 z-10">
              <Lock size={10} className="text-text-secondary" />
            </div>
          )}
      </div>

      {/* Content Area (Label) */}
      <div className="relative flex-1 flex flex-col p-3 md:p-5 bg-[#1a1a1a] group-hover:bg-[#202020] transition-colors duration-500">
         <div className="flex-1">
            <div className="flex items-start justify-between gap-2 md:gap-4">
              <h3 className="text-sm md:text-lg font-serif font-black text-white/90 group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                {flow.name}
              </h3>
            </div>
         </div>

         {/* Footer Info */}
         <div className="mt-2 md:mt-4 flex items-center justify-between border-t border-white/5 pt-2 md:pt-3">
            <div className="flex items-center gap-2">
               {flow.stage_count > 0 && (
                  <span className="text-[10px] md:text-xs text-text-secondary font-serif">
                     {flow.stage_count} 단계
                  </span>
               )}
               {flow.difficulty && (
                  <span className="text-[10px] md:text-xs text-accent/70 font-serif">
                     난이도 {flow.difficulty}
                  </span>
               )}
            </div>

            <div className="flex items-center gap-1 text-accent/50 group-hover:text-accent transition-colors text-[10px] md:text-xs font-serif font-bold tracking-widest">
               OPEN <ChevronRight size={12} strokeWidth={3} />
            </div>
         </div>
      </div>
      
      {/* Hover Glow */}
      <div className="absolute inset-0 ring-1 ring-accent/0 group-hover:ring-accent/50 transition-all duration-500 pointer-events-none" />
    </button>
  );
}
