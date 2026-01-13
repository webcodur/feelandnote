import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCelebs, getProfessionCounts, getContentTypeCounts } from "@/actions/home";
import {
  CelebCarousel,
  CelebFeed,
  FriendActivitySection,
  SignupBanner,
} from "@/components/features/home";

// #region 스켈레톤 컴포넌트
function CarouselSkeleton() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-accent/50 rounded-full" />
        <div className="w-24 h-5 bg-white/10 rounded animate-pulse" />
      </div>
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
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
        <div className="w-20 h-4 bg-white/10 rounded animate-pulse" />
      </div>
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
  const [celebsResult, professionCounts] = await Promise.all([
    getCelebs({ page: 1, limit: 8 }),
    getProfessionCounts(),
  ]);

  return (
    <CelebCarousel
      initialCelebs={celebsResult.celebs}
      initialTotal={celebsResult.total}
      initialTotalPages={celebsResult.totalPages}
      professionCounts={professionCounts}
    />
  );
}

async function CelebFeedServer() {
  const contentTypeCounts = await getContentTypeCounts();
  return <CelebFeed contentTypeCounts={contentTypeCounts} />;
}
// #endregion

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6 pb-24 px-4 md:px-6 lg:px-8">
      {/* 셀럽 캐러셀 - 전체 폭 */}
      <Suspense fallback={<CarouselSkeleton />}>
        <CelebCarouselServer />
      </Suspense>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* 왼쪽: 피드 영역 */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<FeedSkeleton />}>
            <CelebFeedServer />
          </Suspense>
        </div>

        {/* 오른쪽: 사이드바 (PC 전용) */}
        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-20">
            <Suspense fallback={<SidebarSkeleton />}>
              {user && <FriendActivitySection userId={user.id} />}
            </Suspense>
          </div>
        </aside>
      </div>

      {/* 모바일: 친구 소식 */}
      {user && (
        <div className="lg:hidden">
          <Suspense fallback={<SidebarSkeleton />}>
            <FriendActivitySection userId={user.id} />
          </Suspense>
        </div>
      )}

      {/* 비로그인 시 가입 유도 배너 */}
      {!user && <SignupBanner />}
    </div>
  );
}
