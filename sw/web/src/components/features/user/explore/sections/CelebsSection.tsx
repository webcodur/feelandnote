/*
  파일명: /components/features/user/explore/sections/CelebsSection.tsx
  기능: 셀럽 섹션
  책임: 셀럽 목록을 필터링하여 보여준다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { BarChart3, Gem } from "lucide-react";
import CelebCarousel from "@/components/features/home/CelebCarousel";
import FeaturedCollections from "@/components/features/landing/FeaturedCollections";
import InfluenceDistributionModal from "../InfluenceDistributionModal";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, FeaturedTag } from "@/actions/home";

interface Props {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  featuredTags: FeaturedTag[];
}

export default function CelebsSection({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  featuredTags,
}: Props) {
  const [showInfluenceDistribution, setShowInfluenceDistribution] = useState(false);
  const [isCollectionMode, setIsCollectionMode] = useState(false);

  // 검색 우측에 배치될 버튼들 (1행 FilterChipDropdown 스타일에 맞춤)
  const extraButtons = (
    <>
      <button
        type="button"
        onClick={() => setShowInfluenceDistribution(true)}
        className="h-10 flex items-center justify-center gap-1.5 px-3 rounded-lg text-sm font-medium border border-accent/25 bg-white/5 text-text-secondary hover:border-accent/50 hover:text-text-primary flex-1 md:flex-none md:shrink-0"
      >
        <BarChart3 size={14} />
        <span>영향력</span>
      </button>
      {featuredTags.length > 0 && (
        <button
          type="button"
          onClick={() => setIsCollectionMode(!isCollectionMode)}
          className={`h-10 flex items-center justify-center gap-1.5 px-3 rounded-lg text-sm font-medium border animate-featured-glow flex-1 md:flex-none md:shrink-0 ${
            isCollectionMode
              ? "border-accent bg-accent/15 text-accent"
              : "border-accent/25 bg-white/5 text-text-secondary hover:border-accent/50 hover:text-text-primary"
          }`}
        >
          <Gem size={14} className={isCollectionMode ? "text-accent" : "text-accent/60"} />
          <span>기획전</span>
        </button>
      )}
    </>
  );

  return (
    <div className="min-h-[400px]">
      <CelebCarousel
        initialCelebs={initialCelebs}
        initialTotal={initialTotal}
        initialTotalPages={initialTotalPages}
        professionCounts={professionCounts}
        nationalityCounts={nationalityCounts}
        contentTypeCounts={contentTypeCounts}
        mode="grid"
        hideHeader={false}
        syncToUrl
        extraButtons={extraButtons}
        onFilterInteraction={() => setIsCollectionMode(false)}
        customContent={isCollectionMode ? (
          <FeaturedCollections tags={featuredTags} hideQuickBrowse location="explore-pc" />
        ) : undefined}
      />

      <InfluenceDistributionModal
        isOpen={showInfluenceDistribution}
        onClose={() => setShowInfluenceDistribution(false)}
      />
    </div>
  );
}
