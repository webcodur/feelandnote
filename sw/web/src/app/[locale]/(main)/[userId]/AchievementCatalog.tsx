"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trophy, FileText, Check, Plus } from "lucide-react";
import { TITLE_GRADE_CONFIG, TITLE_CATEGORY_CONFIG, TITLE_ICONS, type TitleGrade, type TitleCategory } from "@/constants/titles";
import type { AchievementData, TitleWithStatus } from "@/actions/achievements";
import { DecorativeLabel, InnerBox } from "@/components/ui";
import { TIER_STYLES } from "./achievementTierStyles";

// #region 카탈로그
interface CatalogSectionProps {
  achievements: AchievementData;
  showcaseCodes: string[];
  isOwner: boolean;
  isUpdating: boolean;
  onAddToShowcase: (code: string) => void;
}

export default function CatalogSection({ achievements, showcaseCodes, isOwner, isUpdating, onAddToShowcase }: CatalogSectionProps) {
  const t = useTranslations("profilePage.achievements");
  const tTitle = useTranslations("title");
  const locale = useLocale();
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

    if (diffMins < 1) return t("justNow");
    if (diffMins < 60) return t("minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("daysAgo", { count: diffDays });
    return date.toLocaleDateString(locale === "en" ? "en-US" : "ko-KR");
  };

  const formatCondition = (condition: { type: string; value: number }) => {
    const value = condition.value.toLocaleString(locale === "en" ? "en-US" : "ko-KR");
    switch (condition.type) {
      case "content_count": return t("condition.contentCount", { value });
      case "record_count": return t("condition.recordCount", { value });
      case "completed_count": return t("condition.completedCount", { value });
      case "category_count": return t("condition.categoryCount", { value });
      case "creator_count": return t("condition.creatorCount", { value });
      case "avg_review_length": return t("condition.averageReviewLength", { value });
      case "long_review_count": return t("condition.longReviewCount", { value });
      default: return t("condition.unknown", { type: condition.type, value });
    }
  };

  const categoryLabel = (category: string) => {
    if (category === "volume") return tTitle("category.volume");
    if (category === "diversity") return tTitle("category.diversity");
    if (category === "depth") return tTitle("category.depth");
    return category;
  };

  const canAddMore = showcaseCodes.length < 3;

  return (
    <div className="space-y-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex justify-center mb-6">
        <DecorativeLabel label={t("archive")} />
      </div>

      {/* 점수 요약 & 탭 */}
      <div className="flex flex-col gap-4">
        <InnerBox className="p-0 md:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 md:bg-[#1a1a1a] md:border-[#333]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#d4af37]/10 rounded-full text-[#d4af37]">
              <Trophy size={24} />
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1 font-bold uppercase tracking-wider">{t("totalScore")}</div>
              <div className="text-3xl font-black text-[#d4af37] leading-none font-serif tracking-tight drop-shadow-sm">
                {userScore.total_score.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xl font-bold text-text-primary">{unlockedTitles} <span className="text-text-secondary text-base">/ {totalTitles}</span></div>
              <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">{t("unlocked")}</div>
            </div>

            {isOwner && (
              <div className="flex bg-[#222] p-1 rounded-lg">
                <button
                  onClick={() => setSubTab("titles")}
                  className={`px-4 py-1.5 rounded-md font-bold text-xs transition-all ${subTab === "titles" ? "bg-[#d4af37] text-black shadow-lg" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}
                >
                  {t("titles")}
                </button>
                <button
                  onClick={() => setSubTab("history")}
                  className={`px-4 py-1.5 rounded-md font-bold text-xs transition-all ${subTab === "history" ? "bg-[#d4af37] text-black shadow-lg" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}
                >
                  {t("history")}
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
              {t("noHistory")}
            </div>
          ) : (
            scoreLogs.map(log => (
              <div key={log.id} className="py-3 px-5 flex items-center justify-between bg-[#151515] border border-[#2a2a2a] rounded-lg hover:border-[#444] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.amount >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                    {log.type === "title" ? <Trophy size={14} /> : <FileText size={14} />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-text-primary">{log.action}</div>
                    <div className="text-[11px] text-text-secondary font-mono mt-0.5">{formatDate(log.created_at)}</div>
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
                      <span className="font-bold text-xs uppercase tracking-wider text-text-primary">{categoryLabel(category)}</span>
                    </div>
                    <div className="text-[10px] font-mono text-text-secondary">{Math.round(progress)}%</div>
                  </div>
                  <div className="mt-2 h-1 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-[#d4af37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 카테고리별 칭호 */}
          {categoryStats.map(({ category, titles: categoryTitles }) => {
            const config = TITLE_CATEGORY_CONFIG[category as TitleCategory];
            if (!config) return null;
            const CategoryIcon = config?.icon || Trophy;

            return (
              <div key={category} className="mb-10 last:mb-0">
                <div className="flex items-center gap-3 mb-4 pl-1">
                  <span className="text-[#d4af37] p-1.5 bg-[#d4af37]/10 rounded-md"><CategoryIcon size={18} /></span>
                  <h3 className="text-lg font-serif font-bold text-text-primary">{categoryLabel(category)}</h3>
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
                           <div className="text-[10px] text-[#444] font-bold uppercase tracking-widest text-center">{t("locked")}</div>
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
                           <div className="font-bold text-xs sm:text-sm leading-tight mb-1 truncate px-1">
                             {tTitle.has(`titles.${title.code}.name`) ? tTitle(`titles.${title.code}.name`) : title.name}
                           </div>
                           <div className="text-[10px] opacity-70 truncate px-1">
                             {tTitle.has(`titles.${title.code}.description`) ? tTitle(`titles.${title.code}.description`) : title.description}
                           </div>
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
