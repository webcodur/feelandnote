/*
  파일명: /app/(main)/agora/celeb-feed/page.tsx
  기능: 광장 셀럽 피드 페이지
  책임: 셀럽들의 아카이브 피드를 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import { getCelebFeed } from "@/actions/home";
import CelebFeedSection from "@/components/features/agora/CelebFeedSection";
import { getAgoraPageTitle } from "@/constants/agora";

export const metadata = { title: getAgoraPageTitle("celeb-feed") };

function FeedSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      {/* 카테고리 탭 스켈레톤 */}
      <div className="flex justify-center overflow-x-auto pb-2">
        <div className="inline-flex min-w-max p-1 bg-neutral-900/80 rounded-xl border border-white/10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-14 bg-bg-card rounded-lg mx-0.5" />
          ))}
        </div>
      </div>

      {/* ReviewCard 스켈레톤 - 모바일 2열 / 데스크톱 1열 */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-4 min-h-[400px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            {/* Desktop */}
            <div className="hidden sm:block bg-bg-card border border-border/50 rounded-xl overflow-hidden p-4 md:p-6 max-w-4xl mx-auto">
              <div className="flex gap-6 md:h-[280px]">
                <div className="w-[160px] lg:w-[180px] h-full bg-white/5 shrink-0 rounded" />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="w-32 h-4 bg-white/10 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-white/5 rounded" />
                    <div className="w-full h-3 bg-white/5 rounded" />
                    <div className="w-2/3 h-3 bg-white/5 rounded" />
                  </div>
                </div>
              </div>
            </div>
            {/* Mobile */}
            <div className="sm:hidden bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden">
              <div className="px-2.5 py-2 flex items-center gap-2 border-b border-white/5">
                <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
                <div className="space-y-1">
                  <div className="w-14 h-2.5 bg-white/10 rounded" />
                  <div className="w-9 h-2 bg-white/5 rounded" />
                </div>
              </div>
              <div className="p-1.5">
                <div className="aspect-[2/3] bg-white/5 rounded-lg" />
                <div className="pt-1.5 space-y-1">
                  <div className="w-3/4 h-2.5 bg-white/10 rounded" />
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

async function CelebFeedServer() {
  const celebFeedData = await getCelebFeed({ limit: 10 });

  return (
    <CelebFeedSection
      initialReviews={celebFeedData.reviews}
      initialCursor={celebFeedData.nextCursor}
      initialHasMore={celebFeedData.hasMore}
    />
  );
}

export default function CelebFeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <CelebFeedServer />
    </Suspense>
  );
}
