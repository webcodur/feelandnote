"use client";

import { useState } from "react";
import { Trophy, FileText, Check } from "lucide-react";
import { TITLE_GRADE_CONFIG, TITLE_CATEGORY_CONFIG, TITLES, type TitleGrade, type TitleCategory } from "@/constants/titles";
import type { AchievementData, TitleWithStatus } from "@/actions/achievements";
import { selectTitle } from "@/actions/achievements";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, InnerBox } from "@/components/ui";
import Button from "@/components/ui/Button";

interface ProfileAchievementsSectionProps {
  achievements: AchievementData;
  selectedTitleCode: string | null;
}

export default function ProfileAchievementsSection({ achievements, selectedTitleCode: initialSelectedCode }: ProfileAchievementsSectionProps) {
  const [subTab, setSubTab] = useState<"titles" | "history">("titles");
  const [selectedCode, setSelectedCode] = useState<string | null>(initialSelectedCode);
  const [isSelecting, setIsSelecting] = useState(false);
  const { titles, scoreLogs, userScore } = achievements;

  const handleSelectTitle = async (titleCode: string | null) => {
    if (isSelecting) return;
    setIsSelecting(true);
    const result = await selectTitle(titleCode);
    if (result.success) {
      setSelectedCode(titleCode);
    }
    setIsSelecting(false);
  };

  const titlesByCategory = titles.reduce((acc, title) => {
    if (!acc[title.category]) acc[title.category] = [];
    acc[title.category].push(title);
    return acc;
  }, {} as Record<string, TitleWithStatus[]>);

  const categoryStats = Object.entries(titlesByCategory).map(([category, categoryTitles]) => {
    const unlocked = categoryTitles.filter((t) => t.unlocked).length;
    return { category, unlocked, total: categoryTitles.length, titles: categoryTitles };
  });

  const totalTitles = titles.length;
  const unlockedTitles = titles.filter((t) => t.unlocked).length;

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

  return (
    <section className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
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

        {/* 칭호 표기 안내 */}
        {selectedCode && (
          <InnerBox variant="subtle" className="p-3 mb-4 text-xs text-text-secondary">
            <p className="font-medium text-text-primary mb-1.5">선택한 칭호가 표시되는 곳</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>프로필 사이드바 (닉네임 아래)</li>
              <li>헤더 프로필 메뉴</li>
              <li>친구 활동 피드</li>
              <li>팔로워/팔로잉 목록</li>
              <li>검색 결과</li>
            </ul>
          </InnerBox>
        )}

        {/* 탭 */}
        <div className="flex gap-1.5 mb-4">
          <Button unstyled onClick={() => setSubTab("titles")} className={`px-3 py-1.5 rounded-md font-medium text-xs ${subTab === "titles" ? "bg-bg-secondary text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}>
            칭호 목록
          </Button>
          <Button unstyled onClick={() => setSubTab("history")} className={`px-3 py-1.5 rounded-md font-medium text-xs ${subTab === "history" ? "bg-bg-secondary text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}>
            점수 내역
          </Button>
        </div>

        {/* 점수 내역 탭 */}
        {subTab === "history" && (
          <div className="flex flex-col gap-2">
            {scoreLogs.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-sm">아직 점수 내역이 없다. 콘텐츠를 추가하거나 리뷰를 작성해보라!</div>
            ) : (
              scoreLogs.map((log) => (
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
                    {categoryTitles.map((title) => {
                      const gradeConfig = TITLE_GRADE_CONFIG[title.grade as TitleGrade];
                      const isSelected = selectedCode === title.code;
                      const canSelect = title.unlocked && !isSelecting;
                      return (
                        <div
                          key={title.code}
                          onClick={canSelect ? () => handleSelectTitle(isSelected ? null : title.code) : undefined}
                          className={`bg-bg-card/50 rounded-lg p-3 border ${isSelected ? "ring-2 ring-accent" : ""} ${gradeConfig?.borderColor || "border-accent-dim/10"} ${!title.unlocked ? "opacity-40 bg-black/40" : `bg-gradient-to-br ${gradeConfig?.marble || ""} cursor-pointer hover:ring-1 hover:ring-accent/50`}`}
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${gradeConfig?.bgColor || "bg-white/5"}`}>
                                <CategoryIcon size={18} className={gradeConfig?.color || "text-text-primary"} />
                              </div>
                              <div>
                                <div className={`font-bold text-sm ${gradeConfig?.color || "text-text-primary"}`}>
                                  {title.unlocked ? title.name : "???"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <div className="p-1 rounded bg-accent text-white">
                                  <Check size={14} />
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
    </section>
  );
}
