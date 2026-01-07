/*
  파일명: /app/(main)/profile/achievements/page.tsx
  기능: 업적 페이지
  책임: 사용자의 업적과 칭호를 표시한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { getAchievementData, type AchievementData } from "@/actions/achievements";
import AchievementsContent from "@/components/features/profile/AchievementsContent";

export default function Page() {
  const [achievements, setAchievements] = useState<AchievementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subTab, setSubTab] = useState<"history" | "titles">("history");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await getAchievementData();
        setAchievements(data);
      } catch (error) {
        console.error("Failed to load achievements:", error);
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
        title="업적"
        description="획득한 업적과 칭호를 확인하세요"
        icon={<Trophy size={20} />}
        className="mb-4"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      ) : (
        <AchievementsContent
          data={achievements}
          subTab={subTab}
          setSubTab={setSubTab}
          formatDate={formatDate}
        />
      )}
    </>
  );
}
