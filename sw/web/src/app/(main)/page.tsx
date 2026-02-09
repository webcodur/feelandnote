 
// However, page.tsx itself should remain a Server Component to fetch initial data.
// HomeRecordSection is a Client Component.

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserContents } from "@/actions/contents/getUserContents";
import { getRecentContents } from "@/actions/contents/getRecentContents";
import HomeRecordSection from "@/components/features/quickRecord/HomeRecordSection";
import TodayFigureSection from "@/components/features/figure/TodayFigureSection";
import HomeTabSection from "@/components/features/home/HomeTabSection";
import { HomeNavigationLinks } from "@/components/features/home/HomeNavigationLinks";

import { getProfile } from "@/actions/user/getProfile";
import { getTodayFigure, getQuickRecordSuggestions } from "@/actions/scriptures";

// #region 스켈레톤
function HomeSectionSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-12">
        <div className="h-[400px] bg-white/5 rounded-2xl animate-pulse" />
        <div className="space-y-4">
            <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-[240px] bg-white/5 rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    </div>
  );
}
// #endregion

export default async function MainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. 작성 대기 중인 목록 (리뷰 없음)
  const unreviewedPromise = user 
    ? getUserContents({ userId: user.id, hasReview: false, limit: 10, sortBy: 'recent' }) 
    : Promise.resolve({ items: [] });

  // 2. 나의 최근 기록 (리뷰 있음)
  const reviewedPromise = user 
    ? getUserContents({ userId: user.id, hasReview: true, limit: 10, sortBy: 'recent' }) 
    : Promise.resolve({ items: [] });
    
  // 3. 사용자 프로필
  const profilePromise = getProfile();

  // 4. 오늘의 인물 (Today's Figure)
  const todayFigurePromise = getTodayFigure();



  const [unreviewedResult, reviewedResult, profile, todayFigureResult, initialSuggestions] = await Promise.all([
    unreviewedPromise, 
    reviewedPromise,
    profilePromise,
    todayFigurePromise,
    getQuickRecordSuggestions('BOOK')
  ]);

  const RecordSection = (
    <Suspense fallback={<HomeSectionSkeleton />}>
      <HomeRecordSection 
          unreviewedList={unreviewedResult.items}
          reviewedList={reviewedResult.items}
          profile={profile}
          initialSuggestions={initialSuggestions}
      />
    </Suspense>
  );

  const FigureSectionContent = (
    <div className="flex flex-col gap-12">
      <Suspense fallback={<div className="h-64 bg-white/5 rounded-xl animate-pulse" />}>
        <TodayFigureSection figure={todayFigureResult.figure!} contents={todayFigureResult.contents} />
      </Suspense>

      <HomeNavigationLinks />
    </div>
  );

  return (
    <div className="pb-20">
      <HomeTabSection 
        recordSection={RecordSection}
        figureSection={FigureSectionContent}
      />
    </div>
  );
}
