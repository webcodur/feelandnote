/*
  파일명: /components/features/profile/StatsContent.tsx
  기능: 사용자 통계 콘텐츠
  책임: 콘텐츠/리뷰/노트/인용 요약 및 카테고리 분포 표시
*/ // ------------------------------
"use client";

import { Card } from "@/components/ui";
import { Archive, FileText, MessageCircle, Quote } from "lucide-react";
import { CategoryDonutChart, ActivityTimeline } from "@/components/features/stats";
import type { DetailedStats } from "@/actions/user";

interface StatsContentProps {
  stats: DetailedStats | null;
}

export default function StatsContent({ stats }: StatsContentProps) {
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

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5">
        {categoryDistribution.length > 0 ? (
          <CategoryDonutChart data={categoryDistribution} />
        ) : (
          <Card>
            <h3 className="text-sm font-bold mb-2">카테고리 분포</h3>
            <div className="text-center py-4 text-text-secondary text-xs">아직 데이터가 없습니다.</div>
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
              icon: a.type === "NOTE" ? "Edit" : "Quote",
            }))}
          />
        ) : (
          <Card>
            <h3 className="text-sm font-bold mb-2">최근 활동</h3>
            <div className="text-center py-4 text-text-secondary text-xs">아직 활동 기록이 없습니다.</div>
          </Card>
        )}
      </section>

      <Card className="bg-gradient-to-r from-accent/10 to-transparent border-accent/30">
        <div className="text-center py-2">
          <h3 className="text-sm font-bold mb-1">더 많은 통계 준비 중</h3>
          <p className="text-text-secondary text-xs">장르별 선호도, 월별 트렌드, 활동 히트맵 등이 곧 추가됩니다.</p>
        </div>
      </Card>
    </>
  );
}
