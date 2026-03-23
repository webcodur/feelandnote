/*
  파일명: /app/(main)/explore/timeline/page.tsx
  기능: 국가별 셀럽 연대기 페이지
  책임: 국가별로 셀럽을 시간순으로 보여준다. 별도 태그 없이 기존 데이터(nationality, birth_date)를 활용.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { getCelebTimeline } from "@/actions/home";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import TimelineSection from "@/components/features/user/explore/sections/TimelineSection";

export const revalidate = 300;

export async function generateMetadata() {
  const t = await getTranslations("explore.timelinePage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/explore/timeline"),
  };
}

function TimelineSkeleton() {
  return (
    <div className="animate-pulse max-w-4xl mx-auto space-y-6">
      {/* 검색 입력 */}
      <div className="max-w-xs mx-auto h-10 bg-bg-card rounded-lg" />

      {/* 국가 칩 - 모바일 가로스크롤 / PC wrap */}
      <div className="flex gap-2 overflow-x-auto md:overflow-x-visible md:flex-wrap md:justify-center pb-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 rounded-full bg-bg-card shrink-0 md:shrink" style={{ width: `${72 + (i % 3) * 16}px` }} />
        ))}
      </div>

      {/* 국가 헤더 */}
      <div className="pt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="w-10 h-10 bg-bg-card rounded-full" />
          <div className="h-7 w-32 bg-bg-card rounded" />
          <div className="h-4 w-40 bg-bg-card rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
        </div>
      </div>

      {/* 시대 구분 */}
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-white/5" />
        <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-bg-card border border-white/5">
          <div className="h-5 w-12 bg-bg-stone-light rounded" />
          <div className="h-3 w-20 bg-bg-stone-light rounded" />
          <div className="h-3 w-16 bg-bg-stone-light rounded" />
        </div>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* 타임라인 항목 */}
      <div className="relative">
        <div className="absolute left-[47px] md:left-[71px] top-0 bottom-0 w-px bg-white/5" />
        <div className="space-y-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-[96px] md:w-[144px] flex items-center justify-end shrink-0">
                <div className="h-5 w-12 bg-bg-card rounded mr-3" />
                <div className="w-3 h-3 rounded-full bg-bg-card border-2 border-white/5 z-10" />
              </div>
              <div className="flex items-center gap-4 flex-1 p-2.5 min-w-0">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-bg-card shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex gap-2">
                    <div className="h-5 bg-bg-card rounded" style={{ width: `${80 + (i % 4) * 20}px` }} />
                    <div className="h-5 w-24 bg-bg-card rounded" />
                  </div>
                  <div className="h-4 bg-bg-card rounded" style={{ width: `${60 + (i % 3) * 30}%` }} />
                </div>
                <div className="w-9 h-9 bg-bg-card rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function TimelineContent() {
  const { celebs, countries } = await getCelebTimeline();

  return (
    <AsyncIntlProvider>
      <TimelineSection celebs={celebs} countries={countries} />
    </AsyncIntlProvider>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<TimelineSkeleton />}>
      <TimelineContent />
    </Suspense>
  );
}
