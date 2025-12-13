"use client";

import { useState } from "react";
import { Tab, Tabs, SectionHeader } from "@/components/ui";
import { FileText, Trophy, Archive, Compass, Calendar, PenTool, Users, Sparkles } from "lucide-react";
import type { AchievementData, Title } from "@/actions/achievements";

const gradeColors: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const gradeIcons: Record<string, string> = {
  common: "⬜",
  uncommon: "🟩",
  rare: "🟦",
  epic: "🟪",
  legendary: "🟨",
};

const categoryConfig: Record<string, { name: string; icon: React.ReactNode; comingSoon?: boolean }> = {
  volume: { name: "기록량", icon: <Archive size={20} /> },
  diversity: { name: "다양성", icon: <Compass size={20} /> },
  consistency: { name: "꾸준함", icon: <Calendar size={20} /> },
  depth: { name: "깊이", icon: <PenTool size={20} /> },
  social: { name: "소셜", icon: <Users size={20} />, comingSoon: true },
  special: { name: "특수", icon: <Sparkles size={20} /> },
};

interface Props {
  data: AchievementData | null;
}

export default function AchievementsView({ data }: Props) {
  const [activeTab, setActiveTab] = useState("history");

  // 데이터가 없으면 로그인 안내
  if (!data) {
    return (
      <>
        <SectionHeader
          title="업적"
          description="활동으로 점수를 쌓고 다양한 칭호를 획득하세요"
          icon={<Trophy size={24} />}
          className="mb-8"
        />
        <div className="flex flex-col items-center justify-center py-20">
          <Trophy size={64} className="text-text-secondary mb-4" />
          <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
          <p className="text-text-secondary">업적을 확인하려면 로그인해주세요.</p>
        </div>
      </>
    );
  }

  const { titles, scoreLogs, userScore } = data;

  // 카테고리별로 칭호 그룹화
  const titlesByCategory = titles.reduce((acc, title) => {
    if (!acc[title.category]) {
      acc[title.category] = [];
    }
    acc[title.category].push(title);
    return acc;
  }, {} as Record<string, Title[]>);

  // 카테고리별 통계 계산
  const categoryStats = Object.entries(titlesByCategory).map(([category, categoryTitles]) => {
    const unlocked = categoryTitles.filter(t => t.unlocked).length;
    const total = categoryTitles.length;
    return { category, unlocked, total, titles: categoryTitles };
  });

  // 전체 통계
  const totalTitles = titles.length;
  const unlockedTitles = titles.filter(t => t.unlocked).length;
  const totalBonus = titles.filter(t => t.unlocked).reduce((sum, t) => sum + t.bonus_score, 0);

  // 날짜 포맷
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
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <>
      <SectionHeader
        title="업적"
        description="활동으로 점수를 쌓고 다양한 칭호를 획득하세요"
        icon={<Trophy size={24} />}
        className="mb-8"
      />

      {/* Score Dashboard */}
      <div
        className="bg-bg-card rounded-3xl p-8 border border-border mb-8 flex justify-between items-center"
        style={{
          backgroundImage: `linear-gradient(rgba(124, 77, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 77, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      >
        <div className="flex-1">
          <div className="text-sm text-text-secondary mb-2 font-semibold">총 업적 점수</div>
          <div className="text-5xl font-black bg-gradient-to-br from-white to-indigo-300 bg-clip-text text-transparent leading-none">
            {userScore.total_score.toLocaleString()}
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">{userScore.activity_score.toLocaleString()}</div>
            <div className="text-[13px] text-text-secondary">활동 점수</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">+{userScore.title_bonus.toLocaleString()}</div>
            <div className="text-[13px] text-text-secondary">칭호 보너스</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-8">
        <Tabs>
          <Tab label="점수 내역" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          <Tab label="칭호 목록" active={activeTab === "titles"} onClick={() => setActiveTab("titles")} />
        </Tabs>
      </div>

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4">
          {scoreLogs.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              아직 점수 내역이 없습니다. 콘텐츠를 추가하거나 리뷰를 작성해보세요!
            </div>
          ) : (
            scoreLogs.map((log) => (
              <div
                key={log.id}
                className="bg-bg-card rounded-xl py-4 px-6 border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">
                    {log.type === 'title' ? <Trophy size={20} /> : <FileText size={20} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-[15px]">{log.action}</div>
                    <div className="text-[13px] text-text-secondary">{formatDate(log.created_at)}</div>
                  </div>
                </div>
                <div className={`text-base font-bold ${log.amount >= 0 ? 'text-accent' : 'text-red-400'}`}>
                  {log.amount >= 0 ? '+' : ''}{log.amount}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Titles Tab */}
      {activeTab === "titles" && (
        <div>
          {/* Progress Summary */}
          <div className="bg-bg-card rounded-2xl p-6 border border-border mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-text-secondary mb-1">전체 진행률</div>
                <div className="text-3xl font-bold">
                  {unlockedTitles} / {totalTitles}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-text-secondary mb-1">획득 보너스</div>
                <div className="text-3xl font-bold text-accent">+{totalBonus}점</div>
              </div>
            </div>

            {/* Category Progress */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categoryStats.map(({ category, unlocked, total }) => {
                const config = categoryConfig[category];
                if (!config) return null;
                const progress = total > 0 ? (unlocked / total) * 100 : 0;
                return (
                  <div key={category} className="bg-bg-main rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-accent">{config.icon}</span>
                      <span className="font-semibold text-sm">{config.name}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-text-secondary">
                      {unlocked} / {total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Title Categories */}
          {categoryStats.map(({ category, unlocked, total, titles: categoryTitles }) => {
            const config = categoryConfig[category];
            if (!config) return null;

            return (
              <div key={category} className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-accent">{config.icon}</span>
                  <h3 className="text-2xl font-bold">{config.name}</h3>
                  <span className="text-sm text-text-secondary">
                    ({unlocked}/{total})
                  </span>
                  {config.comingSoon && (
                    <span className="text-xs font-semibold py-1 px-2 rounded-lg bg-yellow-500/20 text-yellow-400">
                      개발예정
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                  {categoryTitles.map((title) => (
                    <div
                      key={title.id}
                      className={`bg-bg-card rounded-xl p-5 border border-border transition-all duration-200 hover:-translate-y-1 hover:border-accent
                        ${!title.unlocked ? "opacity-60 bg-black/20" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{gradeIcons[title.grade]}</span>
                          <div>
                            <div className={`font-bold text-base ${gradeColors[title.grade]}`}>
                              {title.unlocked ? title.name : "???"}
                            </div>
                            {title.unlocked && title.unlocked_at && (
                              <div className="text-xs text-text-secondary mt-0.5">
                                {new Date(title.unlocked_at).toLocaleDateString('ko-KR')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs font-semibold py-1 px-2 rounded-lg bg-white/5">
                          {title.unlocked ? `+${title.bonus_score}점` : "???"}
                        </div>
                      </div>
                      <div className="text-sm text-text-secondary leading-relaxed">
                        {title.unlocked ? `"${title.description}"` : "조건을 달성하면 해금됩니다"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
