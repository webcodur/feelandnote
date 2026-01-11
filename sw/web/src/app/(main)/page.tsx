import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCelebs } from "@/actions/home";
import {
  CelebCarousel,
  ContentTypeTabs,
  CelebFeed,
  FriendActivitySection,
  SignupBanner,
} from "@/components/features/home";

// #region 스켈레톤 컴포넌트
function CarouselSkeleton() {
  return (
    <section className="px-4">
      <div className="w-24 h-6 bg-white/10 rounded mb-4 animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-[120px] md:w-[140px] shrink-0 p-3 rounded-xl bg-bg-card animate-pulse"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 mx-auto mb-2" />
            <div className="w-16 h-4 bg-white/10 rounded mx-auto mb-1" />
            <div className="w-12 h-3 bg-white/10 rounded mx-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}

function TabsSkeleton() {
  return (
    <div className="flex gap-2 px-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-20 h-9 bg-white/10 rounded-full animate-pulse" />
      ))}
    </div>
  );
}
// #endregion

// #region 서버 데이터 페칭 컴포넌트
async function CelebCarouselServer() {
  const { celebs } = await getCelebs({ limit: 20 });
  return <CelebCarousel celebs={celebs} />;
}
// #endregion

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-24">
      <Suspense fallback={<CarouselSkeleton />}>
        <CelebCarouselServer />
      </Suspense>

      <Suspense fallback={<TabsSkeleton />}>
        <ContentTypeTabs />
      </Suspense>

      <CelebFeed />

      {user && <FriendActivitySection userId={user.id} />}
      {!user && <SignupBanner />}
    </div>
  );
}
