/*
  파일명: /components/features/user/explore/sections/CelebStatsBar.tsx
  기능: 인물 목록 상단 통계 버튼 줄
  책임: 영향력 분포 · 인물 통계 모달을 여는 단추 두 개. 카운트 4종이 다 모여야 뜬다 —
        인물 캐러셀(CelebsByProfession)과 다른 레인에서 독립적으로 채워진다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { BarChart3, PieChart } from "lucide-react";
import InfluenceDistributionModal from "../InfluenceDistributionModal";
import CelebStatsModal from "../CelebStatsModal";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts } from "@/actions/home";
import { useTranslations } from "next-intl";

interface CelebStatsBarProps {
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
}

export default function CelebStatsBar({
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
}: CelebStatsBarProps) {
  const [showInfluenceDistribution, setShowInfluenceDistribution] = useState(false);
  const [showCelebStats, setShowCelebStats] = useState(false);
  const t = useTranslations("explore.ui");

  const btnClass = "h-9 flex items-center justify-center gap-2 px-3 rounded-md text-xs font-sans font-bold tracking-wider border border-accent/20 bg-accent/5 text-accent/80 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all duration-300 flex-1 md:flex-none md:shrink-0";

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button type="button" onClick={() => setShowInfluenceDistribution(true)} className={btnClass}>
        <BarChart3 size={14} className="opacity-70" />
        <span>{t("influence")}</span>
      </button>
      <button type="button" onClick={() => setShowCelebStats(true)} className={btnClass}>
        <PieChart size={14} className="opacity-70" />
        <span>{t("stats")}</span>
      </button>

      <InfluenceDistributionModal
        isOpen={showInfluenceDistribution}
        onClose={() => setShowInfluenceDistribution(false)}
      />

      <CelebStatsModal
        isOpen={showCelebStats}
        onClose={() => setShowCelebStats(false)}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        genderCounts={genderCounts}
      />
    </div>
  );
}
