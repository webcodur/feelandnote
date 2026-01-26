import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getContentTypeCounts, getCelebFeed } from "@/actions/home";
import { getFriendActivityTypeCounts } from "@/actions/activity";
import DashboardFeed from "@/components/features/home/DashboardFeed";
import SectionHeader from "@/components/ui/SectionHeader";
import PageContainer from "@/components/layout/PageContainer";

export const metadata = { title: "피드" };

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
      <div className="flex justify-center mb-8">
        <div className="flex gap-6 md:gap-16 border-b border-accent/20 px-4 md:px-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-5 w-20 md:w-28 bg-bg-card rounded my-3 md:my-4" />
          ))}
        </div>
      </div>
      {/* 세그먼트 필터 스켈레톤 */}
      <div className="flex justify-center mb-8 md:mb-12">
        <div className="flex gap-1 p-1 bg-white/5 rounded-full border border-accent/10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-12 sm:w-16 bg-bg-card rounded-full" />
          ))}
        </div>
      </div>
      {/* 피드 카드 스켈레톤 */}
      <div className="space-y-4 max-w-4xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden">
            {/* PC 스켈레톤 */}
            <div className="hidden sm:block">
              {/* 헤더 */}
              <div className="px-4 py-3 flex items-center gap-4 bg-black/20 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="space-y-2">
                  <div className="w-24 h-4 bg-white/10 rounded" />
                  <div className="w-32 h-3 bg-white/5 rounded" />
                </div>
              </div>
              {/* 컨텐츠 */}
              <div className="flex gap-4 p-4 pt-2 h-[280px]">
                <div className="w-48 h-full bg-white/5 shrink-0 rounded" />
                <div className="flex-1 space-y-3 pt-2">
                  <div className="w-full h-3 bg-white/5 rounded" />
                  <div className="w-full h-3 bg-white/5 rounded" />
                  <div className="w-2/3 h-3 bg-white/5 rounded" />
                </div>
              </div>
            </div>
            {/* 모바일 스켈레톤 */}
            <div className="sm:hidden">
              {/* 헤더 */}
              <div className="px-3 py-3 flex items-center gap-3 bg-black/20 border-b border-white/5">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="space-y-1.5">
                  <div className="w-20 h-3 bg-white/10 rounded" />
                  <div className="w-28 h-2 bg-white/5 rounded" />
                </div>
              </div>
              {/* 콘텐츠 */}
              <div className="mx-3 my-3 rounded-lg overflow-hidden border border-white/5 bg-bg-secondary">
                <div className="aspect-[2/3] bg-white/5" />
                <div className="p-3 bg-[#151515] space-y-2">
                  <div className="w-3/4 h-3 bg-white/10 rounded" />
                  <div className="w-1/2 h-2 bg-white/5 rounded" />
                </div>
              </div>
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

  const [friendActivityCounts, celebContentCounts, celebFeedData] = await Promise.all([
    getFriendActivityTypeCounts(),
    getContentTypeCounts(),
    getCelebFeed({ limit: 10 }),
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
        initialReviews={celebFeedData.reviews}
      />
    </>
  );
}

export default function FeedPage() {
  return (
    <PageContainer>
      <Suspense fallback={<FeedSkeleton />}>
        <DashboardFeedServer />
      </Suspense>
    </PageContainer>
  );
}
