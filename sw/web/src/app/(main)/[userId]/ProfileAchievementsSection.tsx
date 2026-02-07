"use client";

import { useState } from "react";
import { Trophy, FileText, Check, Plus, X } from "lucide-react";
import { TITLE_GRADE_CONFIG, TITLE_CATEGORY_CONFIG, TITLE_ICONS, type TitleGrade, type TitleCategory } from "@/constants/titles";
import type { AchievementData, TitleWithStatus } from "@/actions/achievements";
import { updateShowcaseTitles } from "@/actions/achievements";
import { DecorativeLabel, InnerBox } from "@/components/ui";
import Button from "@/components/ui/Button";

// #region Visual Constants
const TIER_STYLES: Record<string, { bg: string; border: string; text: string; shadow: string; glow?: string; iconBg?: string }> = {
  common: {
    bg: "bg-[#2a2a2a]",
    border: "border-stone-600/30",
    text: "text-stone-400",
    shadow: "shadow-inner",
    iconBg: "bg-stone-500/10",
  },
  uncommon: {
    bg: "bg-gradient-to-br from-[#5d4037] to-[#3e2723]",
    border: "border-[#8d6e63]/50",
    text: "text-[#d7ccc8]",
    shadow: "shadow-md",
    iconBg: "bg-[#8d6e63]/20",
  },
  rare: {
    bg: "bg-gradient-to-br from-[#eceff1] to-[#cfd8dc]",
    border: "border-white/80",
    text: "text-[#263238]",
    shadow: "shadow-lg shadow-slate-500/20",
    glow: "after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-br after:from-white/40 after:to-transparent after:opacity-50 pointer-events-none",
    iconBg: "bg-white/50 backdrop-blur-sm",
  },
  epic: {
    bg: "bg-gradient-to-br from-[#ffecb3] via-[#ffca28] to-[#ff6f00]",
    border: "border-[#ffecb3]",
    text: "text-[#3e2723]",
    shadow: "shadow-[0_0_20px_rgba(255,193,7,0.4)]",
    glow: "after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-t after:from-white/40 after:to-transparent after:opacity-60 overflow-hidden pointer-events-none",
    iconBg: "bg-white/40 backdrop-blur-md",
  },
};
// #endregion

interface ProfileAchievementsSectionProps {
  achievements: AchievementData;
  showcaseCodes: string[];
  isOwner?: boolean;
}

export default function ProfileAchievementsSection({ achievements, showcaseCodes: initialShowcaseCodes, isOwner = true }: ProfileAchievementsSectionProps) {
  const [showcaseCodes, setShowcaseCodes] = useState<string[]>(initialShowcaseCodes);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAddToShowcase = async (code: string) => {
    if (isUpdating || showcaseCodes.length >= 3 || showcaseCodes.includes(code)) return;
    const next = [...showcaseCodes, code];
    setIsUpdating(true);
    const result = await updateShowcaseTitles(next);
    if (result.success) setShowcaseCodes(next);
    setIsUpdating(false);
  };

  const handleRemoveFromShowcase = async (code: string) => {
    if (isUpdating) return;
    const next = showcaseCodes.filter(c => c !== code);
    setIsUpdating(true);
    const result = await updateShowcaseTitles(next);
    if (result.success) setShowcaseCodes(next);
    setIsUpdating(false);
  };

  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
      <ShowcaseSection
        showcaseCodes={showcaseCodes}
        titles={achievements.titles}
        isOwner={isOwner}
        isUpdating={isUpdating}
        onRemove={handleRemoveFromShowcase}
      />
      <CatalogSection
        achievements={achievements}
        showcaseCodes={showcaseCodes}
        isOwner={isOwner}
        isUpdating={isUpdating}
        onAddToShowcase={handleAddToShowcase}
      />
    </section>
  );
}

// #region 진열대
interface ShowcaseSectionProps {
  showcaseCodes: string[];
  titles: TitleWithStatus[];
  isOwner: boolean;
  isUpdating: boolean;
  onRemove: (code: string) => void;
}

function ShowcaseSection({ showcaseCodes, titles, isOwner, isUpdating, onRemove }: ShowcaseSectionProps) {
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
                    relative aspect-[3/4] rounded-lg p-2 sm:p-5 flex flex-col items-center justify-center text-center gap-2 sm:gap-4
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
                        &ldquo;{title.description}&rdquo;
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
              <div key={`empty-${i}`} className="aspect-[3/4] rounded-lg bg-[#0a0a0a]/40 border border-[#333] flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden group/empty shadow-inner hover:border-[#d4af37]/30 hover:bg-[#0a0a0a]/60 transition-all duration-300">
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

// #region 카탈로그
interface CatalogSectionProps {
  achievements: AchievementData;
  showcaseCodes: string[];
  isOwner: boolean;
  isUpdating: boolean;
  onAddToShowcase: (code: string) => void;
}

function CatalogSection({ achievements, showcaseCodes, isOwner, isUpdating, onAddToShowcase }: CatalogSectionProps) {
  const [subTab, setSubTab] = useState<"titles" | "history">("titles");
  const { titles, scoreLogs, userScore } = achievements;

  const titlesByCategory = titles.reduce((acc, title) => {
    if (!acc[title.category]) acc[title.category] = [];
    acc[title.category].push(title);
    return acc;
  }, {} as Record<string, TitleWithStatus[]>);

  const categoryStats = Object.entries(titlesByCategory).map(([category, categoryTitles]) => {
    const unlocked = categoryTitles.filter(t => t.unlocked).length;
    return { category, unlocked, total: categoryTitles.length, titles: categoryTitles };
  });

  const totalTitles = titles.length;
  const unlockedTitles = titles.filter(t => t.unlocked).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const formatCondition = (condition: { type: string; value: number }) => {
    const conditionLabels: Record<string, string> = {
      content_count: "콘텐츠 {v}개 추가",
      record_count: "기록 {v}개 작성",
      completed_count: "콘텐츠 {v}개 완료",
      category_count: "{v}개 분야 섭렵",
      creator_count: "창작자 {v}명 탐험",
      avg_review_length: "평균 리뷰 {v}자 이상",
      long_review_count: "긴 리뷰 {v}개 작성",
    };
    const template = conditionLabels[condition.type] || `${condition.type}: {v}`;
    return template.replace("{v}", condition.value.toLocaleString());
  };

  const canAddMore = showcaseCodes.length < 3;

  return (
    <div className="space-y-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex justify-center mb-6">
        <DecorativeLabel label="업적 보관소" />
      </div>

      {/* 점수 요약 & 탭 */}
      <div className="flex flex-col gap-4">
        <InnerBox className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#1a1a1a] border-[#333]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#d4af37]/10 rounded-full text-[#d4af37]">
              <Trophy size={24} />
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1 font-bold uppercase tracking-wider">Total Score</div>
              <div className="text-3xl font-black text-[#d4af37] leading-none font-serif tracking-tight drop-shadow-sm">
                {userScore.total_score.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xl font-bold text-text-primary">{unlockedTitles} <span className="text-text-secondary text-base">/ {totalTitles}</span></div>
              <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Unlocked</div>
            </div>
            
            {isOwner && (
              <div className="flex bg-[#222] p-1 rounded-lg">
                <button 
                  onClick={() => setSubTab("titles")} 
                  className={`px-4 py-1.5 rounded-md font-bold text-xs transition-all ${subTab === "titles" ? "bg-[#d4af37] text-black shadow-lg" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}
                >
                  TITLES
                </button>
                <button 
                  onClick={() => setSubTab("history")} 
                  className={`px-4 py-1.5 rounded-md font-bold text-xs transition-all ${subTab === "history" ? "bg-[#d4af37] text-black shadow-lg" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}
                >
                  HISTORY
                </button>
              </div>
            )}
          </div>
        </InnerBox>
      </div>

      {/* 점수 내역 탭 */}
      {subTab === "history" && (
        <div className="flex flex-col gap-2">
          {scoreLogs.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-sm bg-[#111] rounded-lg border border-[#222] border-dashed">
              아직 기록된 역사가 없다.
            </div>
          ) : (
            scoreLogs.map(log => (
              <div key={log.id} className="py-3 px-5 flex items-center justify-between bg-[#151515] border border-[#2a2a2a] rounded-lg hover:border-[#444] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.amount >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                    {log.type === "title" ? <Trophy size={14} /> : <FileText size={14} />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-stone-200">{log.action}</div>
                    <div className="text-[11px] text-stone-500 font-mono mt-0.5">{formatDate(log.created_at)}</div>
                  </div>
                </div>
                <div className={`text-sm font-black mono ${log.amount >= 0 ? "text-[#d4af37]" : "text-red-400"}`}>{log.amount >= 0 ? "+" : ""}{log.amount}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 칭호 목록 탭 */}
      {subTab === "titles" && (
        <div>
          {/* 진행률 바 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {categoryStats.map(({ category, unlocked, total }) => {
              const config = TITLE_CATEGORY_CONFIG[category as TitleCategory];
              if (!config) return null;
              const progress = total > 0 ? (unlocked / total) * 100 : 0;
              const CategoryIcon = config.icon;
              return (
                <div key={category} className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 top-0 bg-[#d4af37]/5 transition-all duration-1000" style={{ width: `${progress}%` }} />
                  <div className="relative flex justify-between items-center z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[#d4af37]"><CategoryIcon size={16} /></span>
                      <span className="font-bold text-xs uppercase tracking-wider text-stone-300">{config.label}</span>
                    </div>
                    <div className="text-[10px] font-mono text-stone-500">{Math.round(progress)}%</div>
                  </div>
                  <div className="mt-2 h-1 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-[#d4af37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 카테고리별 칭호 */}
          {categoryStats.map(({ category, unlocked, total, titles: categoryTitles }) => {
            const config = TITLE_CATEGORY_CONFIG[category as TitleCategory];
            if (!config) return null;
            const CategoryIcon = config?.icon || Trophy;
            
            return (
              <div key={category} className="mb-10 last:mb-0">
                <div className="flex items-center gap-3 mb-4 pl-1">
                  <span className="text-[#d4af37] p-1.5 bg-[#d4af37]/10 rounded-md"><CategoryIcon size={18} /></span>
                  <h3 className="text-lg font-serif font-bold text-stone-200">{config.label}</h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-[#333] to-transparent ml-2" />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {categoryTitles.map(title => {
                    const gradeConfig = TITLE_GRADE_CONFIG[title.grade as TitleGrade];
                    const isInShowcase = showcaseCodes.includes(title.code);
                    const canAdd = isOwner && title.unlocked && canAddMore && !isInShowcase && !isUpdating;
                    const tierStyle = TIER_STYLES[title.grade as keyof typeof TIER_STYLES] || TIER_STYLES.common;
                    
                    if (!title.unlocked) {
                      // Locked State: Ancient Slab style
                      return (
                        <div key={title.code} className="aspect-[4/3] bg-[#111] border border-[#222] rounded-lg p-3 flex flex-col items-center justify-center gap-2 grayscale opacity-60 hover:opacity-100 transition-opacity group cursor-help">
                           <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center text-[#444] group-hover:text-[#666] transition-colors">
                             {(() => {
                             const IconComponent = title.icon ? TITLE_ICONS[title.icon] : CategoryIcon;
                             return <IconComponent size={16} />;
                           })()}
                           </div>
                           <div className="text-[10px] text-[#444] font-bold uppercase tracking-widest text-center">Locked</div>
                           <div className="text-[10px] text-[#444] text-center px-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 inset-x-2 bg-[#111]/90 py-1 rounded">
                             {formatCondition(title.condition)}
                           </div>
                        </div>
                      );
                    }

                    // Unlocked State: Mini Plaque style
                    return (
                      <div
                        key={title.code}
                        onClick={canAdd ? () => onAddToShowcase(title.code) : undefined}
                        className={`
                          relative group flex flex-col items-center p-3 rounded-lg border transition-all duration-300
                          ${tierStyle.bg} ${tierStyle.border} ${tierStyle.text}
                          ${isInShowcase ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-black opacity-50 grayscale" : ""}
                          ${canAdd ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg" : ""}
                        `}
                      >
                         {/* Selection Overlay */}
                         {canAdd && (
                           <div className="absolute inset-0 bg-[#d4af37]/0 group-hover:bg-[#d4af37]/10 transition-colors rounded-lg z-10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                             <Plus size={24} className="text-white drop-shadow-md" />
                           </div>
                         )}

                         <div className={`p-2 rounded-full mb-2 ${tierStyle.iconBg || 'bg-black/20'}`}>
                           {(() => {
                             const IconComponent = title.icon ? TITLE_ICONS[title.icon] : CategoryIcon;
                             return <IconComponent size={18} className="opacity-90" />;
                           })()}
                         </div>
                         
                         <div className="text-center w-full">
                           <div className="font-bold text-xs sm:text-sm leading-tight mb-1 truncate px-1">{title.name}</div>
                           <div className="text-[10px] opacity-70 truncate px-1">{title.description}</div>
                         </div>

                         {isInShowcase && (
                           <div className="absolute top-2 right-2 text-blue-400 bg-black/50 rounded-full p-0.5">
                             <Check size={12} />
                           </div>
                         )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// #endregion
