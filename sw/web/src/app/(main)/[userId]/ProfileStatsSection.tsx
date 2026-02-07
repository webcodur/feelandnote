"use client";

import { CheckCircle2, Heart, FileText, MessageCircle, Star } from "lucide-react";
import { InnerBox } from "@/components/ui";
import type { DetailedStats } from "@/actions/user";

interface ProfileStatsSectionProps {
  stats: DetailedStats;
}

export default function ProfileStatsSection({ stats }: ProfileStatsSectionProps) {
  const { summary, categoryBreakdown, monthlyTrend, ratingStats } = stats;

  return (
    <section className="animate-fade-in space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} value={summary.totalFinished} label="감상 완료" color="text-accent" />
        <StatCard icon={Heart} value={summary.totalWant} label="관심" color="text-rose-400" />
        <StatCard icon={FileText} value={summary.totalReviews} label="리뷰" color="text-green-400" />
        <StatCard icon={MessageCircle} value={summary.totalRecords} label="노트·인용" color="text-blue-400" />
      </div>

      {/* 카테고리별 현황 */}
      <CategoryBreakdown data={categoryBreakdown} />

      {/* 월별 추이 + 평점 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyTrend data={monthlyTrend} />
        <RatingDistribution stats={ratingStats} />
      </div>
    </section>
  );
}

// #region 요약 카드
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

// #region 카테고리별 현황
function CategoryBreakdown({ data }: { data: DetailedStats["categoryBreakdown"] }) {
  if (data.length === 0) {
    return (
      <InnerBox hover={false} className="p-6">
        <h3 className="text-sm font-bold mb-2 font-serif">카테고리별 현황</h3>
        <div className="text-center py-4 text-text-secondary text-xs">아직 데이터가 없다.</div>
      </InnerBox>
    );
  }

  const maxTotal = Math.max(...data.map((c) => c.finished + c.want));

  return (
    <InnerBox hover={false} className="p-6">
      <h3 className="text-sm font-bold mb-4 font-serif">카테고리별 현황</h3>
      <div className="space-y-3">
        {data.map((cat) => {
          const total = cat.finished + cat.want;
          const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
          const finishedPct = total > 0 ? (cat.finished / total) * pct : 0;

          // 상태 텍스트
          const parts: string[] = [];
          if (cat.finished > 0) parts.push(`${cat.finished}완료`);
          if (cat.want > 0) parts.push(`${cat.want}관심`);

          return (
            <div key={cat.type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text-primary">{cat.label}</span>
                <span className="text-xs text-text-secondary">
                  {total}{cat.unit} ({parts.join("/")})
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full flex">
                  {finishedPct > 0 && (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${finishedPct}%`, backgroundColor: cat.color }}
                    />
                  )}
                  {cat.want > 0 && (
                    <div
                      className="h-full rounded-full opacity-30"
                      style={{ width: `${pct - finishedPct}%`, backgroundColor: cat.color }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </InnerBox>
  );
}
// #endregion

// #region 월별 활동 추이
function MonthlyTrend({ data }: { data: DetailedStats["monthlyTrend"] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <InnerBox hover={false} className="p-6">
      <h3 className="text-sm font-bold mb-4 font-serif">월별 활동 추이</h3>
      <div className="space-y-2">
        {data.map((item) => {
          const pct = (item.count / maxCount) * 100;
          return (
            <div key={item.month} className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-8 text-right shrink-0">{item.month}</span>
              <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
                {item.count > 0 && (
                  <div
                    className="h-full bg-accent rounded"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <span className="text-xs text-text-secondary w-6 text-right shrink-0">{item.count}</span>
            </div>
          );
        })}
      </div>
    </InnerBox>
  );
}
// #endregion

// #region 평점 분포
function RatingDistribution({ stats }: { stats: DetailedStats["ratingStats"] }) {
  const maxDist = Math.max(...stats.distribution, 1);

  return (
    <InnerBox hover={false} className="p-6">
      <h3 className="text-sm font-bold mb-4 font-serif">평점 분포</h3>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((score) => {
          const count = stats.distribution[score - 1];
          const pct = (count / maxDist) * 100;
          return (
            <div key={score} className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 w-20 shrink-0">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < score ? "text-amber-500 fill-amber-500" : "text-white/10"}
                  />
                ))}
              </div>
              <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                {count > 0 && (
                  <div
                    className="h-full bg-amber-500 rounded"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <span className="text-xs text-text-secondary w-6 text-right shrink-0">{count}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center text-xs text-text-secondary">
        {stats.average != null
          ? `평균 ${stats.average} / ${stats.count}건`
          : "아직 평점이 없다."}
      </div>
    </InnerBox>
  );
}
// #endregion
