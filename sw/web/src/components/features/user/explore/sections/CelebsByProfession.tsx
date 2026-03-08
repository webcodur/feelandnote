"use client";

import { useState } from "react";
import { BarChart3, PieChart } from "lucide-react";
import ProfessionCarousel from "../ProfessionCarousel";
import InfluenceDistributionModal from "../InfluenceDistributionModal";
import CelebStatsModal from "../CelebStatsModal";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import type { ProfessionSection, ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts } from "@/actions/home";
import { useTranslations } from "next-intl";

interface CelebsByProfessionProps {
  sections: ProfessionSection[];
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
}

export default function CelebsByProfession({
  sections,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
}: CelebsByProfessionProps) {
  const { handleSubtitle } = useDialogueSubtitle();
  const [showInfluenceDistribution, setShowInfluenceDistribution] = useState(false);
  const [showCelebStats, setShowCelebStats] = useState(false);
  const t = useTranslations("explore.ui");

  const btnClass = "h-9 flex items-center justify-center gap-2 px-3 rounded-md text-xs font-sans font-bold tracking-wider border border-accent/20 bg-accent/5 text-accent/80 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all duration-300 flex-1 md:flex-none md:shrink-0";

  return (
    <div className="space-y-8 md:space-y-10">
      {/* 유틸리티 버튼 바 */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowInfluenceDistribution(true)} className={btnClass}>
          <BarChart3 size={14} className="opacity-70" />
          <span>{t("influence")}</span>
        </button>
        <button type="button" onClick={() => setShowCelebStats(true)} className={btnClass}>
          <PieChart size={14} className="opacity-70" />
          <span>{t("stats")}</span>
        </button>
      </div>

      {/* 직군별 캐러셀 */}
      {sections.map((section) => (
        <ProfessionCarousel
          key={section.profession}
          profession={section.profession}
          label={section.label}
          celebs={section.celebs}
          totalCount={section.totalCount}
          onSubtitle={handleSubtitle}
        />
      ))}


      {/* 모달들 */}
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
