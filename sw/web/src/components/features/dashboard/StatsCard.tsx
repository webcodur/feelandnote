/*
  파일명: /components/features/dashboard/StatsCard.tsx
  기능: 사용자 통계 카드
  책임: 총 감상, 리뷰, 기록 수 등 사용자 통계를 표시한다.
*/ // ------------------------------
"use client";

import { useState, useEffect } from "react";
import { getStats, type UserStats } from "@/actions/user";
import { Loader2 } from "lucide-react";

export default function StatsCard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getStats();
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
      <div className="flex gap-6">
        <Loader2 size={20} className="animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    { label: "총 감상", value: stats.totalContents },
    { label: "리뷰", value: stats.totalReviews },
    { label: "기록", value: stats.totalRecords },
  ];

  return (
    <div className="flex gap-6">
      {statItems.map((stat, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="text-xl font-bold">{stat.value}</div>
          <div className="text-xs text-text-secondary">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
