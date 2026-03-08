/*
  파일명: /app/(main)/explore/spotlight/page.tsx
  기능: 스포트라이트 독립 페이지
  책임: 스포트라이트(FeaturedSpotlight)를 독립 페이지로 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getFeaturedTags } from "@/actions/home";
import FeaturedSpotlight from "@/components/features/landing/FeaturedSpotlight";

export async function generateMetadata() {
  const t = await getTranslations("explore.spotlight");
  return {
    title: t("metaTitle"),
  };
}

function SpotlightSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-bg-card rounded-lg flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[13/19] bg-bg-card rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function SpotlightServer({ initialTagId }: { initialTagId?: string }) {
  const featuredTags = await getFeaturedTags();

  return (
    <AsyncIntlProvider>
      <FeaturedSpotlight tags={featuredTags} location="explore-pc" initialTagId={initialTagId} />
    </AsyncIntlProvider>
  );
}

export default async function SpotlightPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const tag = typeof params.tag === "string" ? params.tag : undefined;

  return (
    <Suspense fallback={<SpotlightSkeleton />}>
      <SpotlightServer initialTagId={tag} />
    </Suspense>
  );
}
