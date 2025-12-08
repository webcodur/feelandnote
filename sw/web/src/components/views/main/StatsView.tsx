"use client";

import { useState, useEffect } from "react";
import { SectionHeader, Card } from "@/components/ui";
import { BarChart2, Loader2, FileText, MessageCircle, Quote, Archive } from "lucide-react";
import { getDetailedStats, type DetailedStats } from "@/actions/user";
import {
  CategoryDonutChart,
  ActivityTimeline,
} from "@/components/features/stats";

export default function StatsView() {
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDetailedStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <>
        <SectionHeader title="통계" icon={<BarChart2 size={24} />} />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <SectionHeader title="통계" icon={<BarChart2 size={24} />} />
        <div className="text-center py-20 text-text-secondary">
          통계를 불러올 수 없습니다.
        </div>
      </>
    );
  }

  const { summary, categoryDistribution, recentActivities } = stats;

  return (
    <>
      <SectionHeader title="통계" icon={<BarChart2 size={24} />} />
      <p className="text-text-secondary mb-8 -mt-4">나의 문화생활 통계를 한눈에 확인하세요</p>

      {/* 요약 카드 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <Archive size={24} className="mx-auto mb-2 text-accent" />
          <div className="text-3xl font-bold">{summary.totalContents}</div>
          <div className="text-sm text-text-secondary">총 콘텐츠</div>
        </Card>
        <Card className="text-center">
          <FileText size={24} className="mx-auto mb-2 text-green-400" />
          <div className="text-3xl font-bold">{summary.totalReviews}</div>
          <div className="text-sm text-text-secondary">리뷰</div>
        </Card>
        <Card className="text-center">
          <MessageCircle size={24} className="mx-auto mb-2 text-blue-400" />
          <div className="text-3xl font-bold">{summary.totalNotes}</div>
          <div className="text-sm text-text-secondary">노트</div>
        </Card>
        <Card className="text-center">
          <Quote size={24} className="mx-auto mb-2 text-yellow-400" />
          <div className="text-3xl font-bold">{summary.totalQuotes}</div>
          <div className="text-sm text-text-secondary">인용</div>
        </Card>
      </section>

      {/* 카테고리 분포 + 최근 활동 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {categoryDistribution.length > 0 ? (
          <CategoryDonutChart data={categoryDistribution} />
        ) : (
          <Card>
            <h3 className="text-lg font-bold mb-4">카테고리 분포</h3>
            <div className="text-center py-8 text-text-secondary">
              아직 데이터가 없습니다.
            </div>
          </Card>
        )}

        {recentActivities.length > 0 ? (
          <ActivityTimeline activities={recentActivities.map((a, i) => ({
            id: i,
            type: a.type.toLowerCase(),
            title: a.title,
            time: a.time,
            points: 0,
            icon: a.type === 'REVIEW' ? 'FileText' : a.type === 'NOTE' ? 'Edit' : 'Quote'
          }))} />
        ) : (
          <Card>
            <h3 className="text-lg font-bold mb-4">최근 활동</h3>
            <div className="text-center py-8 text-text-secondary">
              아직 활동 기록이 없습니다.
            </div>
          </Card>
        )}
      </section>

      {/* 준비 중 안내 */}
      <Card className="bg-gradient-to-r from-accent/10 to-transparent border-accent/30">
        <div className="text-center py-4">
          <h3 className="text-lg font-bold mb-2">더 많은 통계 준비 중</h3>
          <p className="text-text-secondary text-sm">
            장르별 선호도, 월별 트렌드, 활동 히트맵 등 더 다양한 통계가 곧 추가됩니다.
          </p>
        </div>
      </Card>
    </>
  );
}
