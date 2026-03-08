/*
  파일명: /app/(main)/explore/feed/page.tsx
  기능: 인물 피드 페이지
  책임: 인물들의 아카이브 피드를 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getCelebFeed } from "@/actions/home";
import CelebFeedSection from "@/components/features/agora/CelebFeedSection";

export async function generateMetadata() {
  const t = await getTranslations("explore.celebFeed");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-12">
      <div className="flex justify-center overflow-x-auto pb-4 scrollbar-hidden">
        <div className="inline-flex min-w-max p-1 bg-neutral-900/80 rounded-xl border border-white/10 shadow-inner">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-14 bg-white/5 rounded-lg mx-0.5" />
          ))}
        </div>
      </div>
      <div className="relative min-h-[400px]">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3 bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden p-3 sm:p-4 sm:max-w-4xl sm:mx-auto w-full h-[320px] md:h-[280px]">
              <div className="w-28 sm:w-[160px] lg:w-[180px] flex-shrink-0 bg-white/5 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-white/10 shrink-0" />
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
