/*
  파일명: /app/(main)/profile/stats/page.tsx
  기능: 통계 페이지
  책임: 사용자의 문화생활 통계를 표시한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { getDetailedStats, type DetailedStats } from "@/actions/user";
import StatsContent from "@/components/features/profile/StatsContent";

export default function Page() {
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const statsData = await getDetailedStats();
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <>
      <SectionHeader
        title="통계"
        description="나의 문화생활 통계를 확인하세요"
        icon={<BarChart2 size={20} />}
        className="mb-4"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      ) : (
        <StatsContent stats={stats} />
      )}
    </>
  );
}
