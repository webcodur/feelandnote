"use client";

import { useState, useEffect } from "react";
import { SectionHeader, Card, FilterChips, type ChipOption } from "@/components/ui";
import { User, BarChart2, Trophy, Loader2, FileText, MessageCircle, Quote, Archive, Compass, Calendar, PenTool, Users, Sparkles } from "lucide-react";
import { getDetailedStats, type DetailedStats } from "@/actions/user";
import { getAchievementData, type AchievementData, type Title } from "@/actions/achievements";
import { CategoryDonutChart, ActivityTimeline } from "@/components/features/stats";

type ProfileTab = "stats" | "achievements";

const TAB_OPTIONS: ChipOption<ProfileTab>[] = [
  { value: "stats", label: "통계", icon: BarChart2 },
  { value: "achievements", label: "업적", icon: Trophy },
];

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

export default function ProfileView() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [achievements, setAchievements] = useState<AchievementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [achievementSubTab, setAchievementSubTab] = useState<"history" | "titles">("history");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [statsData, achievementsData] = await Promise.all([
          getDetailedStats(),
          getAchievementData(),
        ]);
        setStats(statsData);
        setAchievements(achievementsData);
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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

  return (
    <>
      <SectionHeader
        title="내 정보"
        description="나의 문화생활 통계와 업적을 확인하세요"
        icon={<User size={20} />}
        className="mb-4"
      />

      {/* 카테고리 탭 */}
      <div className="border-b border-border pb-3 mb-4">
        <FilterChips
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={setActiveTab}
          variant="filled"
          showIcon
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      )}

      {/* Stats Tab */}
      {!isLoading && activeTab === "stats" && (
        <StatsContent stats={stats} />
      )}

      {/* Achievements Tab */}
      {!isLoading && activeTab === "achievements" && (
        <AchievementsContent
          data={achievements}
          subTab={achievementSubTab}
          setSubTab={setAchievementSubTab}
          formatDate={formatDate}
        />
      )}
    </>
  );
}

function StatsContent({ stats }: { stats: DetailedStats | null }) {
  if (!stats) {
    return (
      <div className="text-center py-12 text-text-secondary text-sm">
        통계를 불러올 수 없습니다.
      </div>
    );
  }

  const { summary, categoryDistribution, recentActivities } = stats;

  return (
    <>
      {/* 요약 카드 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
        <Card className="text-center py-3">
          <Archive size={20} className="mx-auto mb-1.5 text-accent" />
          <div className="text-2xl font-bold">{summary.totalContents}</div>
          <div className="text-xs text-text-secondary">총 콘텐츠</div>
        </Card>
        <Card className="text-center py-3">
          <FileText size={20} className="mx-auto mb-1.5 text-green-400" />
          <div className="text-2xl font-bold">{summary.totalReviews}</div>
          <div className="text-xs text-text-secondary">리뷰</div>
        </Card>
        <Card className="text-center py-3">
          <MessageCircle size={20} className="mx-auto mb-1.5 text-blue-400" />
          <div className="text-2xl font-bold">{summary.totalNotes}</div>
          <div className="text-xs text-text-secondary">노트</div>
        </Card>
        <Card className="text-center py-3">
          <Quote size={20} className="mx-auto mb-1.5 text-yellow-400" />
          <div className="text-2xl font-bold">{summary.totalQuotes}</div>
          <div className="text-xs text-text-secondary">인용</div>
        </Card>
      </section>

      {/* 카테고리 분포 + 최근 활동 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5">
        {categoryDistribution.length > 0 ? (
          <CategoryDonutChart data={categoryDistribution} />
        ) : (
          <Card>
            <h3 className="text-sm font-bold mb-2">카테고리 분포</h3>
            <div className="text-center py-4 text-text-secondary text-xs">
              아직 데이터가 없습니다.
            </div>
          </Card>
        )}

        {recentActivities.length > 0 ? (
          <ActivityTimeline
            activities={recentActivities.map((a, i) => ({
              id: i,
              type: a.type.toLowerCase(),
              title: a.title,
              time: a.time,
              points: 0,
              icon: a.type === "REVIEW" ? "FileText" : a.type === "NOTE" ? "Edit" : "Quote",
            }))}
          />
        ) : (
          <Card>
            <h3 className="text-sm font-bold mb-2">최근 활동</h3>
            <div className="text-center py-4 text-text-secondary text-xs">
              아직 활동 기록이 없습니다.
            </div>
          </Card>
        )}
      </section>

      {/* 준비 중 안내 */}
      <Card className="bg-gradient-to-r from-accent/10 to-transparent border-accent/30">
        <div className="text-center py-2">
          <h3 className="text-sm font-bold mb-1">더 많은 통계 준비 중</h3>
          <p className="text-text-secondary text-xs">
            장르별 선호도, 월별 트렌드, 활동 히트맵 등이 곧 추가됩니다.
          </p>
        </div>
      </Card>
    </>
  );
}

function AchievementsContent({
  data,
  subTab,
  setSubTab,
  formatDate,
}: {
  data: AchievementData | null;
  subTab: "history" | "titles";
  setSubTab: (tab: "history" | "titles") => void;
  formatDate: (dateStr: string) => string;
}) {
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
    const unlocked = categoryTitles.filter((t) => t.unlocked).length;
    const total = categoryTitles.length;
    return { category, unlocked, total, titles: categoryTitles };
  });

  // 전체 통계
  const totalTitles = titles.length;
  const unlockedTitles = titles.filter((t) => t.unlocked).length;
  const totalBonus = titles.filter((t) => t.unlocked).reduce((sum, t) => sum + t.bonus_score, 0);

  return (
    <>
      {/* Score Dashboard */}
      <div
        className="bg-bg-card rounded-xl p-4 md:p-5 border border-border mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
        style={{
          backgroundImage: `linear-gradient(rgba(124, 77, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 77, 255, 0.05) 1px, transparent 1px)`,
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

      {/* Sub Tabs */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setSubTab("history")}
          className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            subTab === "history"
              ? "bg-bg-secondary text-text-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-white/5"
          }`}
        >
          점수 내역
        </button>
        <button
          onClick={() => setSubTab("titles")}
          className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            subTab === "titles"
              ? "bg-bg-secondary text-text-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-white/5"
          }`}
        >
          칭호 목록
        </button>
      </div>

      {/* History Sub Tab */}
      {subTab === "history" && (
        <div className="flex flex-col gap-2">
          {scoreLogs.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm">
              아직 점수 내역이 없습니다. 콘텐츠를 추가하거나 리뷰를 작성해보세요!
            </div>
          ) : (
            scoreLogs.map((log) => (
              <div
                key={log.id}
                className="bg-bg-card rounded-lg py-2.5 px-4 border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    {log.type === "title" ? <Trophy size={16} /> : <FileText size={16} />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{log.action}</div>
                    <div className="text-[11px] text-text-secondary">{formatDate(log.created_at)}</div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${log.amount >= 0 ? "text-accent" : "text-red-400"}`}>
                  {log.amount >= 0 ? "+" : ""}
                  {log.amount}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Titles Sub Tab */}
      {subTab === "titles" && (
        <div>
          {/* Progress Summary */}
          <div className="bg-bg-card rounded-xl p-4 border border-border mb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-text-secondary mb-0.5">전체 진행률</div>
                <div className="text-2xl font-bold">
                  {unlockedTitles} / {totalTitles}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-secondary mb-0.5">획득 보너스</div>
                <div className="text-2xl font-bold text-accent">+{totalBonus}점</div>
              </div>
            </div>

            {/* Category Progress */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categoryStats.map(({ category, unlocked, total }) => {
                const config = categoryConfig[category];
                if (!config) return null;
                const progress = total > 0 ? (unlocked / total) * 100 : 0;
                return (
                  <div key={category} className="bg-bg-main rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-accent [&>svg]:w-4 [&>svg]:h-4">{config.icon}</span>
                      <span className="font-semibold text-xs">{config.name}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-text-secondary">
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
              <div key={category} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-accent [&>svg]:w-4 [&>svg]:h-4">{config.icon}</span>
                  <h3 className="text-base font-bold">{config.name}</h3>
                  <span className="text-xs text-text-secondary">
                    ({unlocked}/{total})
                  </span>
                  {config.comingSoon && (
                    <span className="text-[10px] font-semibold py-0.5 px-1.5 rounded bg-yellow-500/20 text-yellow-400">
                      개발예정
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                  {categoryTitles.map((title) => (
                    <div
                      key={title.id}
                      className={`bg-bg-card rounded-lg p-3 border border-border transition-all duration-200 hover:-translate-y-0.5 hover:border-accent
                        ${!title.unlocked ? "opacity-60 bg-black/20" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{gradeIcons[title.grade]}</span>
                          <div>
                            <div className={`font-bold text-sm ${gradeColors[title.grade]}`}>
                              {title.unlocked ? title.name : "???"}
                            </div>
                            {title.unlocked && title.unlocked_at && (
                              <div className="text-[10px] text-text-secondary">
                                {new Date(title.unlocked_at).toLocaleDateString("ko-KR")}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] font-semibold py-0.5 px-1.5 rounded bg-white/5">
                          {title.unlocked ? `+${title.bonus_score}점` : "???"}
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary leading-relaxed">
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
