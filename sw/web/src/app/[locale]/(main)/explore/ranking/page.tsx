/*
  파일명: /app/(main)/explore/ranking/page.tsx
  기능: 분야별 랭킹 전체 보기
  책임: 4개 콘텐츠 타입별 Top 10 인물 랭킹을 표시한다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getTopByContentTypeFull } from "@/actions/home/getTopByContentTypeFull";
import { getSharedContents } from "@/actions/home/getSharedContents";
import TopByTypeSection from "@/components/features/user/explore/sections/TopByTypeSection";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("explore.topByType");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/explore/ranking"),
  };
}

function TopByTypeSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      {Array.from({ length: 4 }).map((_, sectionIdx) => (
        <div key={sectionIdx} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-bg-card rounded-full" />
            <div className="w-6 h-6 bg-bg-card rounded" />
            <div className="w-24 h-5 bg-bg-card rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="aspect-square bg-bg-card rounded-md" />
                <div className="h-3 bg-bg-card rounded w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

async function TopByTypeServer() {
  const entries = await getTopByContentTypeFull();

  // 각 카테고리별 top 10 셀럽의 공통 감상 콘텐츠 조회
  const sharedByType: Record<string, Awaited<ReturnType<typeof getSharedContents>>> = {};
  await Promise.all(
    entries.map(async (entry) => {
      const ids = entry.celebs.map((c) => c.id);
      sharedByType[entry.type] = await getSharedContents(ids, entry.type, 10);
    })
  );

  return (
    <AsyncIntlProvider>
      <TopByTypeSection entries={entries} sharedByType={sharedByType} />
    </AsyncIntlProvider>
  );
}

export default function TopByTypePage() {
  return (
    <Suspense fallback={<TopByTypeSkeleton />}>
      <TopByTypeServer />
    </Suspense>
  );
}
