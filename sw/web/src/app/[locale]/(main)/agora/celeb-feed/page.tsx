/*
  파일명: /app/(main)/agora/celeb-feed/page.tsx
  기능: 광장 셀럽 피드 페이지
  책임: 셀럽들의 아카이브 피드를 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getCelebFeed } from "@/actions/home";
import CelebFeedSection from "@/components/features/agora/CelebFeedSection";

export async function generateMetadata() {
  const t = await getTranslations("agora.celebFeed");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

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

      {/* ReviewCard 스켈레톤 - 리뷰형 1열 */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 min-h-[400px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden p-3 sm:p-4 sm:max-w-4xl sm:mx-auto h-[320px] md:h-[280px]">
            <div className="w-28 sm:w-40 flex-shrink-0 bg-white/5 rounded-lg" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
                <div className="space-y-1">
                  <div className="w-16 h-2.5 bg-white/10 rounded" />
                  <div className="w-10 h-2 bg-white/5 rounded" />
                </div>
              </div>
              <div className="w-3/4 h-3 bg-white/10 rounded" />
              <div className="w-1/2 h-2.5 bg-white/5 rounded" />
              <div className="space-y-2 mt-2">
                <div className="w-full h-2.5 bg-white/5 rounded" />
                <div className="w-full h-2.5 bg-white/5 rounded" />
                <div className="w-2/3 h-2.5 bg-white/5 rounded" />
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
    <AsyncIntlProvider>
      <CelebFeedSection
        initialReviews={celebFeedData.reviews}
        initialCursor={celebFeedData.nextCursor}
        initialHasMore={celebFeedData.hasMore}
      />
    </AsyncIntlProvider>
  );
}

export default function CelebFeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <CelebFeedServer />
    </Suspense>
  );
}
