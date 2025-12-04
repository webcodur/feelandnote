"use client";

import { USER_DETAILED_STATS } from "@/lib/mock-data";
import { SectionHeader } from "@/components/ui";
import { BarChart2 } from "lucide-react";
import {
  StatsSummaryCards,
  CategoryDonutChart,
  InfluenceGauge,
  ActivityHeatmap,
  TitleProgressCard,
  GenreRadarChart,
  MonthlyTrendChart,
  ActivityTimeline,
} from "@/components/features/stats";

export default function StatsPage() {
  const {
    summary,
    categoryDistribution,
    influence,
    influenceRanks,
    activityHeatmap,
    titles,
    genrePreferences,
    monthlyTrend,
    recentActivities,
  } = USER_DETAILED_STATS;

  return (
    <>
      <SectionHeader title="통계" icon={<BarChart2 size={24} />} />
      <p className="text-text-secondary mb-8 -mt-4">나의 문화생활 통계를 한눈에 확인하세요</p>

      {/* 요약 카드 */}
      <section className="mb-8">
        <StatsSummaryCards summary={summary} influence={influence} />
      </section>

      {/* 카테고리 분포 + 영향력 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CategoryDonutChart data={categoryDistribution} />
        <InfluenceGauge influence={influence} ranks={influenceRanks} />
      </section>

      {/* 연간 활동 히트맵 */}
      <section className="mb-8">
        <ActivityHeatmap data={activityHeatmap} />
      </section>

      {/* 칭호 현황 + 최근 활동 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TitleProgressCard titles={titles} />
        <ActivityTimeline activities={recentActivities} />
      </section>

      {/* 장르 선호도 + 월별 트렌드 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenreRadarChart data={genrePreferences} />
        <MonthlyTrendChart data={monthlyTrend} />
      </section>
    </>
  );
}
