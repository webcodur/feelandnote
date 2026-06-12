"use client";

import { Trophy, Plus, X } from "lucide-react";
import { TITLE_GRADE_CONFIG, TITLE_CATEGORY_CONFIG, TITLE_ICONS, type TitleGrade, type TitleCategory } from "@/constants/titles";
import type { TitleWithStatus } from "@/actions/achievements";
import { DecorativeLabel } from "@/components/ui";
import { TIER_STYLES } from "./achievementTierStyles";

// #region 진열대
interface ShowcaseSectionProps {
  showcaseCodes: string[];
  titles: TitleWithStatus[];
  isOwner: boolean;
  isUpdating: boolean;
  onRemove: (code: string) => void;
}

export default function ShowcaseSection({ showcaseCodes, titles, isOwner, isUpdating, onRemove }: ShowcaseSectionProps) {
  const slots = Array.from({ length: 3 }, (_, i) => {
    const code = showcaseCodes[i];
    if (!code) return null;
    return titles.find(t => t.code === code) || null;
  });

  // 방문자에게 진열대가 비어있으면 표시하지 않음
  if (!isOwner && showcaseCodes.length === 0) return null;

  return (
    <div className="relative rounded-xl overflow-hidden mb-8 group perspective-1000 animate-fade-in-up">
      {/* Altar Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-[#d4af37]/20 rounded-xl shadow-2xl" />
      {/* Texture Overlay (Optional, assuming standard patterns exist or falling back to simple noise via CSS) */}
      <div className="absolute inset-0 bg-neutral-900/50 mix-blend-overlay" />

      {/* Spotlight Effect */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#d4af37]/10 via-transparent to-transparent opacity-60 pointer-events-none" />

      <div className="relative p-4 sm:p-10 flex flex-col items-center">
        <div className="mb-6 sm:mb-10 relative z-10">
          <DecorativeLabel label="명예의 전당" className="scale-110 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-4xl px-0 sm:px-4">
          {slots.map((title, i) => {
            if (title) {
              const gradeConfig = TITLE_GRADE_CONFIG[title.grade as TitleGrade];
              const config = TITLE_CATEGORY_CONFIG[title.category as TitleCategory];
              const CategoryIcon = (title.icon ? TITLE_ICONS[title.icon] : null) || config?.icon || Trophy;
              const tierStyle = TIER_STYLES[title.grade as keyof typeof TIER_STYLES] || TIER_STYLES.common;

              const isRareOrAbove = ['rare', 'epic'].includes(title.grade);

              return (
                <div
                  key={title.code}
                  onClick={isOwner && !isUpdating ? () => onRemove(title.code) : undefined}
                  className={`
                    relative group/card transition-all duration-500 hover:z-20
                    ${isOwner ? "cursor-pointer hover:-translate-y-3 hover:scale-105" : ""}
                  `}
                >
                  {/* The Plaque */}
                  <div className={`
                    relative aspect-square rounded-lg p-2 sm:p-5 flex flex-col items-center justify-center text-center gap-2 sm:gap-4
                    border-2 sm:border-[3px] transition-all duration-500
                    ${tierStyle.bg} ${tierStyle.border} ${tierStyle.text} ${tierStyle.shadow}
                    ${isRareOrAbove ? 'shadow-glow-sm' : ''}
                  `}>
                    {/* Interior Glow/Sheen */}
                    <div className={`${tierStyle.glow || ''}`} />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center gap-1 w-full">
                      <div className={`
                        p-2 sm:p-3.5 rounded-full mb-1 sm:mb-3 shadow-inner ring-1 ring-white/10
                        ${tierStyle.iconBg || 'bg-black/20'}
                        transition-transform duration-500 group-hover/card:scale-110 group-hover/card:rotate-3
                      `}>
                        <CategoryIcon className={`size-5 sm:size-8
                          ${isRareOrAbove ? 'text-inherit drop-shadow-md' : 'text-inherit opacity-90'}
                        `} />
                      </div>

                      <div className="space-y-1.5 w-full">
                        <div className="font-serif font-black text-xs sm:text-xl leading-tight break-keep drop-shadow-sm line-clamp-2 min-h-[2em] sm:min-h-[2.5em] flex items-center justify-center">
                          {title.name}
                        </div>
                        <div className={`text-[9px] sm:text-xs font-bold uppercase tracking-widest opacity-70 ${isRareOrAbove ? 'font-cinzel' : ''}`}>
                          {gradeConfig.label}
                        </div>
                      </div>

                      <div className="w-8 sm:w-12 h-[1px] bg-current opacity-30 my-1 sm:my-3" />

                      <div className="hidden sm:block text-[11px] font-medium opacity-80 leading-relaxed px-1 break-keep line-clamp-3">
                        {title.description}
                      </div>
                    </div>

                    {/* Remove Button */}
                    {isOwner && (
                      <div className="absolute -top-2 -right-2 opacity-0 group-hover/card:opacity-100 transition-all duration-300 p-1.5 rounded-full bg-red-900 text-white shadow-lg z-20 hover:bg-red-700 hover:scale-110 border border-red-500/50">
                        <X size={14} />
                      </div>
                    )}
                  </div>

                  {/* Plaque Shadow on Altar Floor */}
                  <div className="absolute -bottom-5 inset-x-6 h-3 bg-black/60 blur-lg rounded-[100%] pointer-events-none transition-all duration-500 group-hover/card:scale-75 group-hover/card:opacity-40" />
                </div>
              );
            }

            // Empty Slot (The Niche)
            if (!isOwner) return <div key={`empty-${i}`} />;

            return (
              <div key={`empty-${i}`} className="aspect-square rounded-lg bg-[#0a0a0a]/40 border border-[#333] flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden group/empty shadow-inner hover:border-[#d4af37]/30 hover:bg-[#0a0a0a]/60 transition-all duration-300">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#d4af37]/5 to-transparent opacity-0 group-hover/empty:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <Plus className="size-6 sm:size-8 text-[#333] group-hover/empty:text-[#d4af37] transition-all duration-300 mb-1 sm:mb-3 group-hover/empty:scale-110 group-hover/empty:rotate-90" />
                <span className="text-[9px] sm:text-xs text-[#444] font-cinzel font-bold tracking-widest group-hover/empty:text-[#d4af37] transition-colors duration-300 uppercase">
                  Empty Niche
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// #endregion
