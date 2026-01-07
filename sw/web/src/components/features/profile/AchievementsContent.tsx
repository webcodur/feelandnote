/*
  파일명: /components/features/profile/AchievementsContent.tsx
  기능: 업적 및 칭호 콘텐츠 표시
  책임: 점수 내역, 칭호 목록, 카테고리별 진행률 렌더링
*/ // ------------------------------
"use client";

import { Trophy, FileText, Archive, Compass, Calendar, PenTool, Users, Sparkles } from "lucide-react";
import type { AchievementData, Title } from "@/actions/achievements";
import Button from "@/components/ui/Button";

const gradeColors: Record<string, string> = {
  common: "text-gray-400", uncommon: "text-green-400", rare: "text-blue-400",
  epic: "text-purple-400", legendary: "text-yellow-400",
};

const gradeIcons: Record<string, string> = {
  common: "⬜", uncommon: "🟩", rare: "🟦", epic: "🟪", legendary: "🟨",
};

const categoryConfig: Record<string, { name: string; icon: React.ReactNode; comingSoon?: boolean }> = {
  volume: { name: "기록량", icon: <Archive size={20} /> },
  diversity: { name: "다양성", icon: <Compass size={20} /> },
  consistency: { name: "꾸준함", icon: <Calendar size={20} /> },
  depth: { name: "깊이", icon: <PenTool size={20} /> },
  social: { name: "소셜", icon: <Users size={20} />, comingSoon: true },
  special: { name: "특수", icon: <Sparkles size={20} /> },
};

interface AchievementsContentProps {
  data: AchievementData | null;
  subTab: "history" | "titles";
  setSubTab: (tab: "history" | "titles") => void;
  formatDate: (dateStr: string) => string;
}

export default function AchievementsContent({ data, subTab, setSubTab, formatDate }: AchievementsContentProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Trophy size={48} className="text-text-secondary mb-3" />
        <h2 className="text-lg font-bold mb-1">로그인이 필요합니다</h2>
        <p className="text-text-secondary text-sm">업적을 확인하려면 로그인해주세요.</p>
      </div>
    );
  }

  const { titles, scoreLogs, userScore } = data;

  const titlesByCategory = titles.reduce((acc, title) => {
    if (!acc[title.category]) acc[title.category] = [];
    acc[title.category].push(title);
    return acc;
  }, {} as Record<string, Title[]>);

  const categoryStats = Object.entries(titlesByCategory).map(([category, categoryTitles]) => {
    const unlocked = categoryTitles.filter((t) => t.unlocked).length;
    return { category, unlocked, total: categoryTitles.length, titles: categoryTitles };
  });

  const totalTitles = titles.length;
  const unlockedTitles = titles.filter((t) => t.unlocked).length;
  const totalBonus = titles.filter((t) => t.unlocked).reduce((sum, t) => sum + t.bonus_score, 0);

  return (
    <>
      <div
        className="bg-bg-card rounded-xl p-4 md:p-5 border border-border mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
        style={{
          backgroundImage: `linear-gradient(rgba(124, 77, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 77, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      >
        <div className="flex-1">
          <div className="text-xs text-text-secondary mb-1 font-semibold">총 업적 점수</div>
          <div className="text-3xl md:text-4xl font-black bg-gradient-to-br from-white to-indigo-300 bg-clip-text text-transparent leading-none">
            {userScore.total_score.toLocaleString()}
          </div>
        </div>
        <div className="flex gap-5">
          <div className="text-right">
            <div className="text-lg md:text-xl font-bold text-text-primary">{userScore.activity_score.toLocaleString()}</div>
            <div className="text-[11px] text-text-secondary">활동 점수</div>
          </div>
          <div className="text-right">
            <div className="text-lg md:text-xl font-bold text-accent">+{userScore.title_bonus.toLocaleString()}</div>
            <div className="text-[11px] text-text-secondary">칭호 보너스</div>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        <Button unstyled onClick={() => setSubTab("history")} className={`px-3 py-1.5 rounded-md font-medium text-xs ${subTab === "history" ? "bg-bg-secondary text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}>
          점수 내역
        </Button>
        <Button unstyled onClick={() => setSubTab("titles")} className={`px-3 py-1.5 rounded-md font-medium text-xs ${subTab === "titles" ? "bg-bg-secondary text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}>
          칭호 목록
        </Button>
      </div>

      {subTab === "history" && (
        <div className="flex flex-col gap-2">
          {scoreLogs.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm">아직 점수 내역이 없습니다. 콘텐츠를 추가하거나 리뷰를 작성해보세요!</div>
          ) : (
            scoreLogs.map((log) => (
              <div key={log.id} className="bg-bg-card rounded-lg py-2.5 px-4 border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    {log.type === "title" && <Trophy size={16} />}
                    {log.type !== "title" && <FileText size={16} />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{log.action}</div>
                    <div className="text-[11px] text-text-secondary">{formatDate(log.created_at)}</div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${log.amount >= 0 ? "text-accent" : "text-red-400"}`}>{log.amount >= 0 ? "+" : ""}{log.amount}</div>
              </div>
            ))
          )}
        </div>
      )}

      {subTab === "titles" && (
        <div>
          <div className="bg-bg-card rounded-xl p-4 border border-border mb-5">
            <div className="flex items-center justify-between mb-4">
              <div><div className="text-xs text-text-secondary mb-0.5">전체 진행률</div><div className="text-2xl font-bold">{unlockedTitles} / {totalTitles}</div></div>
              <div className="text-right"><div className="text-xs text-text-secondary mb-0.5">획득 보너스</div><div className="text-2xl font-bold text-accent">+{totalBonus}점</div></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categoryStats.map(({ category, unlocked, total }) => {
                const config = categoryConfig[category];
                if (!config) return null;
                const progress = total > 0 ? (unlocked / total) * 100 : 0;
                return (
                  <div key={category} className="bg-bg-main rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-2"><span className="text-accent [&>svg]:w-4 [&>svg]:h-4">{config.icon}</span><span className="font-semibold text-xs">{config.name}</span></div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1"><div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} /></div>
                    <div className="text-[10px] text-text-secondary">{unlocked} / {total}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {categoryStats.map(({ category, unlocked, total, titles: categoryTitles }) => {
            const config = categoryConfig[category];
            if (!config) return null;
            return (
              <div key={category} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-accent [&>svg]:w-4 [&>svg]:h-4">{config.icon}</span>
                  <h3 className="text-base font-bold">{config.name}</h3>
                  <span className="text-xs text-text-secondary">({unlocked}/{total})</span>
                  {config.comingSoon && <span className="text-[10px] font-semibold py-0.5 px-1.5 rounded bg-yellow-500/20 text-yellow-400">개발예정</span>}
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                  {categoryTitles.map((title) => (
                    <div key={title.id} className={`bg-bg-card rounded-lg p-3 border border-border hover:-translate-y-0.5 hover:border-accent ${!title.unlocked ? "opacity-60 bg-black/20" : ""}`}>
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{gradeIcons[title.grade]}</span>
                          <div>
                            <div className={`font-bold text-sm ${gradeColors[title.grade]}`}>{title.unlocked ? title.name : "???"}</div>
                            {title.unlocked && title.unlocked_at && <div className="text-[10px] text-text-secondary">{new Date(title.unlocked_at).toLocaleDateString("ko-KR")}</div>}
                          </div>
                        </div>
                        <div className="text-[10px] font-semibold py-0.5 px-1.5 rounded bg-white/5">{title.unlocked ? `+${title.bonus_score}점` : "???"}</div>
                      </div>
                      <div className="text-xs text-text-secondary leading-relaxed">{title.unlocked ? `"${title.description}"` : "조건을 달성하면 해금됩니다"}</div>
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
