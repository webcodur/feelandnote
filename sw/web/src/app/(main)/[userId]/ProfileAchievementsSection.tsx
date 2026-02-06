"use client";

import { useState } from "react";
import { Trophy, FileText, Check, Plus, X } from "lucide-react";
import { TITLE_GRADE_CONFIG, TITLE_CATEGORY_CONFIG, type TitleGrade, type TitleCategory } from "@/constants/titles";
import type { AchievementData, TitleWithStatus } from "@/actions/achievements";
import { updateShowcaseTitles } from "@/actions/achievements";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, InnerBox } from "@/components/ui";
import Button from "@/components/ui/Button";

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
    <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
      <div className="flex justify-center mb-6">
        <DecorativeLabel label="진열대" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {slots.map((title, i) => {
          if (title) {
            const gradeConfig = TITLE_GRADE_CONFIG[title.grade as TitleGrade];
            const config = TITLE_CATEGORY_CONFIG[title.category as TitleCategory];
            const CategoryIcon = config?.icon || Trophy;
            return (
              <div
                key={title.code}
                onClick={isOwner && !isUpdating ? () => onRemove(title.code) : undefined}
                className={`relative bg-bg-card/50 rounded-lg p-3 border ${gradeConfig?.borderColor || "border-accent-dim/10"} bg-gradient-to-br ${gradeConfig?.marble || ""} ${isOwner ? "cursor-pointer group hover:ring-1 hover:ring-red-400/50" : ""}`}
              >
                {isOwner && (
                  <div className="absolute top-1.5 end-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-red-500/80 text-white">
                    <X size={12} />
                  </div>
                )}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gradeConfig?.bgColor || "bg-white/5"}`}>
                    <CategoryIcon size={20} className={gradeConfig?.color || "text-text-primary"} />
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${gradeConfig?.color || "text-text-primary"}`}>{title.name}</div>
                    <div className="text-[11px] text-text-secondary/80 italic mt-0.5">&ldquo;{title.description}&rdquo;</div>
                  </div>
                </div>
              </div>
            );
          }
          // 빈 슬롯 (owner만 표시)
          if (!isOwner) return <div key={`empty-${i}`} />;
          return (
            <div key={`empty-${i}`} className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-accent-dim/20 p-4 min-h-[100px]">
              <Plus size={20} className="text-text-secondary/40" />
              <span className="text-[11px] text-text-secondary/40 mt-1">칭호 선택</span>
            </div>
          );
        })}
      </div>
    </ClassicalBox>
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
    <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
      <div className="flex justify-center mb-6 sm:mb-8">
        <DecorativeLabel label="칭호" />
      </div>

      {/* 점수 요약 */}
      <InnerBox className="p-4 md:p-5 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex-1">
          <div className="text-xs text-text-secondary mb-1 font-semibold">총 활동 점수</div>
          <div className="text-3xl md:text-4xl font-black bg-gradient-to-br from-white to-amber-200 bg-clip-text text-transparent leading-none font-serif">
            {userScore.total_score.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg md:text-xl font-bold text-text-primary">{unlockedTitles} / {totalTitles}</div>
          <div className="text-[11px] text-text-secondary">해금된 칭호</div>
        </div>
      </InnerBox>

      {/* 탭 (본인만 점수 내역 탭 노출) */}
      {isOwner && (
        <div className="flex gap-1.5 mb-4">
          <Button unstyled onClick={() => setSubTab("titles")} className={`px-3 py-1.5 rounded-md font-medium text-xs ${subTab === "titles" ? "bg-bg-secondary text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}>
            칭호 목록
          </Button>
          <Button unstyled onClick={() => setSubTab("history")} className={`px-3 py-1.5 rounded-md font-medium text-xs ${subTab === "history" ? "bg-bg-secondary text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}>
            점수 내역
          </Button>
        </div>
      )}

      {/* 점수 내역 탭 */}
      {subTab === "history" && (
        <div className="flex flex-col gap-2">
          {scoreLogs.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm">아직 점수 내역이 없다. 콘텐츠를 추가하거나 리뷰를 작성해보라!</div>
          ) : (
            scoreLogs.map(log => (
              <InnerBox key={log.id} variant="subtle" hover={false} className="py-2.5 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    {log.type === "title" ? <Trophy size={16} /> : <FileText size={16} />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{log.action}</div>
                    <div className="text-[11px] text-text-secondary">{formatDate(log.created_at)}</div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${log.amount >= 0 ? "text-accent" : "text-red-400"}`}>{log.amount >= 0 ? "+" : ""}{log.amount}</div>
              </InnerBox>
            ))
          )}
        </div>
      )}

      {/* 칭호 목록 탭 */}
      {subTab === "titles" && (
        <div>
          {/* 진행률 요약 */}
          <InnerBox className="p-4 mb-5">
            <div className="grid grid-cols-3 gap-2">
              {categoryStats.map(({ category, unlocked, total }) => {
                const config = TITLE_CATEGORY_CONFIG[category as TitleCategory];
                if (!config) return null;
                const progress = total > 0 ? (unlocked / total) * 100 : 0;
                const CategoryIcon = config.icon;
                return (
                  <div key={category} className="bg-bg-main rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-accent [&>svg]:w-4 [&>svg]:h-4"><CategoryIcon size={16} /></span>
                      <span className="font-semibold text-xs">{config.label}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-[10px] text-text-secondary">{unlocked} / {total}</div>
                  </div>
                );
              })}
            </div>
          </InnerBox>

          {/* 카테고리별 칭호 */}
          {categoryStats.map(({ category, unlocked, total, titles: categoryTitles }) => {
            const config = TITLE_CATEGORY_CONFIG[category as TitleCategory];
            if (!config) return null;
            const CategoryIcon = config.icon;
            return (
              <div key={category} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-accent [&>svg]:w-4 [&>svg]:h-4"><CategoryIcon size={16} /></span>
                  <h3 className="text-base font-bold font-serif">{config.label}</h3>
                  <span className="text-xs text-text-secondary">({unlocked}/{total})</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                  {categoryTitles.map(title => {
                    const gradeConfig = TITLE_GRADE_CONFIG[title.grade as TitleGrade];
                    const isInShowcase = showcaseCodes.includes(title.code);
                    const canAdd = isOwner && title.unlocked && canAddMore && !isInShowcase && !isUpdating;
                    return (
                      <div
                        key={title.code}
                        onClick={canAdd ? () => onAddToShowcase(title.code) : undefined}
                        className={`bg-bg-card/50 rounded-lg p-3 border ${isInShowcase ? "ring-2 ring-accent" : ""} ${gradeConfig?.borderColor || "border-accent-dim/10"} ${!title.unlocked ? "opacity-40 bg-black/40" : `bg-gradient-to-br ${gradeConfig?.marble || ""} ${canAdd ? "cursor-pointer hover:ring-1 hover:ring-accent/50" : ""}`}`}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${gradeConfig?.bgColor || "bg-white/5"}`}>
                              <CategoryIcon size={18} className={gradeConfig?.color || "text-text-primary"} />
                            </div>
                            <div className={`font-bold text-sm ${gradeConfig?.color || "text-text-primary"}`}>
                              {title.unlocked ? title.name : "???"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isInShowcase && (
                              <div className="p-1 rounded bg-accent text-white">
                                <Check size={14} />
                              </div>
                            )}
                            {canAdd && (
                              <div className="p-1 rounded bg-white/10 text-text-secondary hover:bg-accent/20 hover:text-accent">
                                <Plus size={14} />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-text-secondary/90 leading-relaxed italic">
                          {title.unlocked ? `"${title.description}"` : formatCondition(title.condition)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ClassicalBox>
  );
}
// #endregion
