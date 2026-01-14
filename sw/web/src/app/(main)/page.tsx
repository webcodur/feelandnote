import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts } from "@/actions/home";
import { getFriendActivityTypeCounts } from "@/actions/activity";
import {
  CelebCarousel,
  CelebFeed,
  FriendActivitySection,
  SignupBanner,
} from "@/components/features/home";
import HomeTabSection from "@/components/features/home/HomeTabSection";

// #region 스켈레톤 컴포넌트
function CarouselSkeleton() {
  return (
    <section>
      <div className="flex gap-4 overflow-hidden md:grid md:grid-cols-8 md:gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex flex-col items-center animate-pulse shrink-0">
            <div className="w-16 h-16 md:w-14 md:h-14 rounded-full bg-white/10 ring-2 ring-white/5 mb-2" />
            <div className="w-14 h-3 bg-white/10 rounded mb-1" />
            <div className="w-10 h-2 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-bg-card border border-border rounded-xl p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="flex-1">
              <div className="w-24 h-4 bg-white/10 rounded" />
            </div>
          </div>
          <div className="flex gap-3 bg-bg-secondary rounded-lg p-3 mb-3">
            <div className="w-14 h-20 bg-white/10 rounded" />
            <div className="flex-1 space-y-2">
              <div className="w-32 h-4 bg-white/10 rounded" />
              <div className="w-20 h-3 bg-white/10 rounded" />
            </div>
          </div>
          <div className="w-full h-4 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl bg-bg-card animate-pulse">
          <div className="w-12 h-16 rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="w-20 h-3 bg-white/10 rounded" />
            <div className="w-28 h-4 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
// #endregion

// #region 서버 데이터 페칭 컴포넌트
async function CelebCarouselServer() {
  const [celebsResult, professionCounts, nationalityCounts] = await Promise.all([
    getCelebs({ page: 1, limit: 8 }),
    getProfessionCounts(),
    getNationalityCounts(),
  ]);

  return (
    <CelebCarousel
      initialCelebs={celebsResult.celebs}
      initialTotal={celebsResult.total}
      initialTotalPages={celebsResult.totalPages}
      professionCounts={professionCounts}
      nationalityCounts={nationalityCounts}
      hideHeader={true}
    />
  );
}

async function CelebFeedServer() {
  const contentTypeCounts = await getContentTypeCounts();
  return <CelebFeed contentTypeCounts={contentTypeCounts} hideHeader={true} />;
}

async function FriendActivityServer({ userId }: { userId: string }) {
  const activityTypeCounts = await getFriendActivityTypeCounts();
  return (
    <FriendActivitySection
      userId={userId}
      hideHeader={true}
      activityTypeCounts={activityTypeCounts}
    />
  );
}
// #endregion

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6 pb-24 px-4 md:px-6 lg:px-8">
      <HomeTabSection
        celebTabContent={
          <Suspense fallback={<CarouselSkeleton />}>
            <CelebCarouselServer />
          </Suspense>
        }
        feedTabContent={
          <Suspense fallback={<FeedSkeleton />}>
            <CelebFeedServer />
          </Suspense>
        }
        friendTabContent={
          user ? (
            <Suspense fallback={<SidebarSkeleton />}>
              <FriendActivityServer userId={user.id} />
            </Suspense>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl bg-bg-card border border-border">
              <p className="text-sm text-text-secondary mb-2">로그인이 필요한 서비스입니다</p>
            </div>
          )
        }
      />

      {/* 비로그인 시 가입 유도 배너 */}
      {!user && <SignupBanner />}
    </div>
  );
}
