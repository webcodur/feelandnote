"use client";

import { Archive, FileText, MessageCircle, Quote } from "lucide-react";
import { CategoryDonutChart, ActivityTimeline } from "@/components/features/profile/stats";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, InnerBox } from "@/components/ui";
import type { DetailedStats } from "@/actions/user";

interface ProfileStatsSectionProps {
  stats: DetailedStats;
}

export default function ProfileStatsSection({ stats }: ProfileStatsSectionProps) {
  const { summary, categoryDistribution, recentActivities } = stats;

  return (
    <section className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
        <div className="flex justify-center mb-6 sm:mb-8">
          <DecorativeLabel label="통계" />
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Archive} value={summary.totalContents} label="총 콘텐츠" color="text-accent" />
          <StatCard icon={FileText} value={summary.totalReviews} label="리뷰" color="text-green-400" />
          <StatCard icon={MessageCircle} value={summary.totalNotes} label="노트" color="text-blue-400" />
          <StatCard icon={Quote} value={summary.totalQuotes} label="인용" color="text-yellow-400" />
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categoryDistribution.length > 0 ? (
            <CategoryDonutChart data={categoryDistribution} />
          ) : (
            <InnerBox className="p-6">
              <h3 className="text-sm font-bold mb-2 font-serif">카테고리 분포</h3>
              <div className="text-center py-4 text-text-secondary text-xs">아직 데이터가 없다.</div>
            </InnerBox>
          )}

          {recentActivities.length > 0 ? (
            <ActivityTimeline
              activities={recentActivities.map((a, i) => ({
                id: i,
                type: a.type.toLowerCase(),
                title: a.title,
                time: a.time,
                points: 0,
                icon: a.type === "NOTE" ? "Edit" : "Quote",
              }))}
            />
          ) : (
            <InnerBox className="p-6">
              <h3 className="text-sm font-bold mb-2 font-serif">최근 활동</h3>
              <div className="text-center py-4 text-text-secondary text-xs">아직 활동 기록이 없다.</div>
            </InnerBox>
          )}
        </div>
      </ClassicalBox>
    </section>
  );
}

// #region 하위 컴포넌트
interface StatCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: number;
  label: string;
  color: string;
}

function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  return (
    <InnerBox hover={false} className="p-4 text-center">
      <Icon size={20} className={`mx-auto mb-2 ${color}`} />
      <div className="text-2xl font-bold font-serif">{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </InnerBox>
  );
}
// #endregion
