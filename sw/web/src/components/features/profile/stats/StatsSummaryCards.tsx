/*
  파일명: /components/features/stats/StatsSummaryCards.tsx
  기능: 통계 요약 카드 그리드 렌더링
  책임: 주요 통계 지표를 아이콘과 함께 카드 형태로 표시
*/ // ------------------------------
"use client";

import { Card } from "@/components/ui";
import { Book, FileText, Edit3, Sparkles, TrendingUp, Users } from "lucide-react";

interface StatsSummaryCardsProps {
  summary: {
    totalContents: number;
    totalReviews: number;
    totalNotes: number;
    totalCreations: number;
    activityScore: number;
    totalScore: number;
  };
  influence: {
    totalInfluence: number;
    rank: string;
    rankEmoji: string;
  };
}

const statItems = [
  { key: "totalContents", label: "총 감상", icon: Book, color: "#7c4dff" },
  { key: "totalReviews", label: "리뷰", icon: FileText, color: "#f59e0b" },
  { key: "totalNotes", label: "노트", icon: Edit3, color: "#10b981" },
  { key: "totalCreations", label: "창작", icon: Sparkles, color: "#ec4899" },
  { key: "activityScore", label: "활동 점수", icon: TrendingUp, color: "#06b6d4" },
  { key: "influence", label: "영향력", icon: Users, color: "#8b5cf6" },
];

export default function StatsSummaryCards({ summary, influence }: StatsSummaryCardsProps) {
  const getValue = (key: string) => {
    if (key === "influence") {
      return influence.totalInfluence.toLocaleString();
    }
    return (summary[key as keyof typeof summary] || 0).toLocaleString();
  };

  const getSubtext = (key: string) => {
    if (key === "influence") {
      return `${influence.rankEmoji} ${influence.rank}`;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        const subtext = getSubtext(item.key);

        return (
          <Card key={item.key} className="p-5 text-center">
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${item.color}20` }}
            >
              <Icon size={20} style={{ color: item.color }} />
            </div>
            <div className="text-2xl font-bold mb-1">{getValue(item.key)}</div>
            <div className="text-xs text-text-secondary">{item.label}</div>
            {subtext && (
              <div className="text-xs mt-1" style={{ color: item.color }}>
                {subtext}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
