/*
  파일명: /app/(main)/lounge/feed/page.tsx
  기능: 라운지 피드 페이지
  책임: 셀럽과 친구들의 활동 피드를 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getContentTypeCounts, getCelebFeed } from "@/actions/home";
import { getFriendActivityTypeCounts } from "@/actions/activity";
import DashboardFeed from "@/components/features/home/DashboardFeed";
import { getLoungePageTitle } from "@/constants/lounge";

export const metadata = { title: getLoungePageTitle("feed") };

function FeedSkeleton() {
  return (
    <div className="animate-pulse">
      {/* 탭 스켈레톤 */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-6 md:gap-16 border-b border-accent/20 px-4 md:px-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-5 w-20 md:w-28 bg-bg-card rounded my-3 md:my-4" />
          ))}
        </div>
      </div>
      <div className="space-y-4 max-w-4xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden h-[200px]" />
        ))}
      </div>
    </div>
  );
}

async function DashboardFeedServer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [friendActivityCounts, celebContentCounts, celebFeedData] = await Promise.all([
    getFriendActivityTypeCounts(),
    getContentTypeCounts(),
    getCelebFeed({ limit: 10 }),
  ]);

  return (
    <DashboardFeed
      userId={user?.id}
      friendActivityCounts={friendActivityCounts}
      celebContentCounts={celebContentCounts}
      initialReviews={celebFeedData.reviews}
    />
  );
}

export default function LoungeFeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <DashboardFeedServer />
    </Suspense>
  );
}
