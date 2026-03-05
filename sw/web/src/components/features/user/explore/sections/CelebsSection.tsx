/*
  파일명: /components/features/user/explore/sections/CelebsSection.tsx
  기능: 셀럽 섹션 (그리드 뷰)
  책임: 셀럽 목록을 필터링하여 보여준다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import CelebCarousel from "@/components/features/home/CelebCarousel";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts } from "@/actions/home";

interface Props {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
}

export default function CelebsSection({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
}: Props) {
  const [includeInactive, setIncludeInactive] = useState(false);

  return (
    <div className="min-h-[400px]">
      <CelebCarousel
        initialCelebs={initialCelebs}
        initialTotal={initialTotal}
        initialTotalPages={initialTotalPages}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        genderCounts={genderCounts}
        mode="grid"
        hideHeader={false}
        syncToUrl
        includeInactive={includeInactive}
        onIncludeInactiveChange={setIncludeInactive}
      />

      {/* 비활성화 셀럽 포함 토글 버튼 (숨김) */}
      <div className="flex justify-center mt-16 mb-8">
        <button
          type="button"
          onClick={() => setIncludeInactive(!includeInactive)}
          className="text-[10px] text-white/10 hover:text-white/30 transition-colors select-none"
        >
          activate_all{includeInactive ? " ✓" : ""}
        </button>
      </div>
    </div>
  );
}
