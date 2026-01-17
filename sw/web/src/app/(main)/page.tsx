import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts } from "@/actions/home";
import { getFriendActivityTypeCounts } from "@/actions/activity";
import { CelebCarousel } from "@/components/features/home";
import DashboardFeed from "@/components/features/home/DashboardFeed";
import { HeroBackgroundText, Logo } from "@/components/ui";

// #region 스켈레톤 & Helper Components
function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-hidden py-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="min-w-[120px] h-[160px] bg-bg-card rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
// #endregion

// #region 서버 데이터 페칭 컴포넌트
async function CelebCarouselServer() {
  const [celebsResult, professionCounts, nationalityCounts, contentTypeCounts] = await Promise.all([
    getCelebs({ page: 1, limit: 100 }),
    getProfessionCounts(),
    getNationalityCounts(),
    getContentTypeCounts(),
  ]);

  return (
    <CelebCarousel
      initialCelebs={celebsResult.celebs}
      initialTotal={celebsResult.total}
      initialTotalPages={celebsResult.totalPages}
      professionCounts={professionCounts}
      nationalityCounts={nationalityCounts}
      contentTypeCounts={contentTypeCounts}
      hideHeader={true}
      mode="carousel"
    />
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
    <DashboardFeed
      userId={user?.id}
      friendActivityCounts={friendActivityCounts}
      celebContentCounts={celebContentCounts}
    />
  );
}
// #endregion

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-bg-main relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-[1000px] bg-gradient-to-b from-accent/10 via-accent/5 to-transparent pointer-events-none" />
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[120vw] h-[120vw] bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24 relative z-10">
        {/* Background Decoration Text */}
        <HeroBackgroundText text="ARCHIVE" className="top-[5%] hidden xl:block opacity-[0.04]" />
        
        <div className="flex flex-col gap-24 md:gap-40">
          {/* 상단: 추천 셀럽 캐러셀 (Centered Hero Hall) */}
          <section className="w-full flex flex-col items-center space-y-16 animate-slide-down">
            <div className="flex flex-col items-center text-center gap-10 max-w-5xl border-b-2 border-accent-dim/10 pb-20 w-full relative">
              {/* Divine Lintel Decoration */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-accent/40 shadow-glow" />

              <div className="space-y-6 pt-6">
                <span className="font-cinzel text-xs md:text-sm text-accent tracking-[1.5em] uppercase opacity-60 block">Inscribed in Eternity</span>
                <h1 className="flex flex-col items-center">
                  <Logo
                    variant="hero"
                    size="xl"
                    asLink={false}
                    subtitle="THE ARCHIVE OF SOULS"
                  />
                </h1>
                <div className="h-1 w-64 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto rounded-full shadow-[0_0_30px_rgba(212,175,55,0.4)] mt-12" />
                <p className="font-serif italic text-text-tertiary text-sm md:text-lg tracking-widest opacity-70 mt-4">"그들이 사랑한 책, 영화, 음악 등 다양한 콘텐츠의 기록"</p>
              </div>
            </div>
            
            <div className="w-full overflow-visible relative z-10">
              <div className="flex items-end justify-between mb-12 px-4 border-b border-accent-dim/10 pb-4 relative z-0">
                <div className="flex flex-col gap-2">
                  <span className="font-cinzel text-[10px] text-accent tracking-[0.6em] uppercase">Inspiring People</span>
                  <h2 className="font-serif font-black text-2xl md:text-4xl tracking-tighter text-text-primary">
                    영감을 나누는 사람들
                  </h2>
                  <p className="text-sm text-text-tertiary">그들이 경험한 책, 영화, 음악 등 다양한 콘텐츠를 탐색하세요</p>
                </div>
                <Link
                  href="/explore"
                  className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-medium font-sans group"
                >
                  둘러보기
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
              <Suspense fallback={<CarouselSkeleton />}>
                <CelebCarouselServer />
              </Suspense>
            </div>
          </section>

          {/* 하단: 컨텐츠 전당 (The Grand Hall Structure) */}
          <div className="flex flex-col lg:flex-row gap-12 xl:gap-20 items-start relative pb-20">
            {/* Main Content (Center) */}
            <main className="flex-1 min-w-0 w-full flex flex-col gap-24 md:gap-40 animate-slide-up">
              <Suspense fallback={<div className="h-96 bg-bg-card rounded-xl animate-pulse" />}>
                <DashboardFeedServer />
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
