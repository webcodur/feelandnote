/*
  파일명: /components/features/user/explore/sections/CelebsSection.tsx
  기능: 셀럽 섹션 (그리드 뷰)
  책임: 셀럽 목록을 필터링하여 보여준다.
*/ // ------------------------------

"use client";

import CelebCarousel from "@/components/features/home/CelebCarousel";
import type { CelebProfile } from "@/types/home";
import type { getCelebs, ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts } from "@/actions/home";
import type { TrendCountry } from "@/constants/trendCountries";

interface Props {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  initialTrendCountry?: TrendCountry;
  initialTrend?: Awaited<ReturnType<typeof getCelebs>>["trend"];
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
}

export default function CelebsSection({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  initialTrendCountry,
  initialTrend,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
}: Props) {
  return (
    <div className="min-h-[400px]">
      <CelebCarousel
        initialCelebs={initialCelebs}
        initialTotal={initialTotal}
        initialTotalPages={initialTotalPages}
        initialTrendCountry={initialTrendCountry}
        initialTrend={initialTrend}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        genderCounts={genderCounts}
        mode="grid"
        hideHeader={false}
        syncToUrl
      />
    </div>
  );
}
