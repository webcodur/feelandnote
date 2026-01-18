import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getContentTypeCounts } from "@/actions/home";
import { getFriendActivityTypeCounts } from "@/actions/activity";
import DashboardFeed from "@/components/features/home/DashboardFeed";
import SectionHeader from "@/components/ui/SectionHeader";

function FeedSkeleton() {
  return (
    <div className="animate-pulse">
      {/* SectionHeader 스켈레톤 */}
      <div className="flex items-end justify-between mb-8 md:mb-12 px-2 md:px-4 border-b border-accent-dim/10 pb-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-28 bg-bg-card rounded" />
          <div className="h-8 w-36 bg-bg-card rounded" />
          <div className="h-4 w-56 bg-bg-card rounded" />
        </div>
      </div>
      {/* 탭 스켈레톤 */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-bg-card rounded-lg" />
        ))}
      </div>
      {/* 피드 카드 스켈레톤 */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-bg-card rounded-xl">
            <div className="w-12 h-12 bg-bg-secondary rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-bg-secondary rounded" />
              <div className="h-3 w-full bg-bg-secondary rounded" />
              <div className="h-3 w-2/3 bg-bg-secondary rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function DashboardFeedServer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [friendActivityCounts, celebContentCounts] = await Promise.all([
    getFriendActivityTypeCounts(),
    getContentTypeCounts(),
  ]);

  return (
    <>
      <SectionHeader
        variant="hero"
        englishTitle="Chronicle of Stories"
        title="기록의 흐름"
        description="셀럽과 친구들의 최신 활동을 확인하세요"
      />
      <DashboardFeed
        userId={user?.id}
        friendActivityCounts={friendActivityCounts}
        celebContentCounts={celebContentCounts}
      />
    </>
  );
}

export default function FeedPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<FeedSkeleton />}>
        <DashboardFeedServer />
      </Suspense>
    </div>
  );
}
