/*
  파일명: /components/features/user/explore/sections/CelebsSection.tsx
  기능: 셀럽 섹션
  책임: 셀럽 목록을 필터링하여 보여준다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { BarChart3, Sparkles, X } from "lucide-react";
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

  return (
    <div className="min-h-[400px]">
      {/* 상단 버튼 영역 */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setShowInfluenceDistribution(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-border/50 text-text-secondary hover:border-accent/50 hover:text-text-primary bg-bg-card/50"
        >
          <BarChart3 size={14} />
          <span>영향력 분포</span>
        </button>
        {featuredTags.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCollectionMode(!isCollectionMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${
              isCollectionMode
                ? "border-accent bg-accent/10 text-accent"
                : "border-border/50 text-text-secondary hover:border-accent/50 hover:text-text-primary bg-bg-card/50"
            }`}
          >
            <Sparkles size={14} />
            <span>기획전</span>
            {isCollectionMode && <X size={14} className="ml-1" />}
          </button>
        )}
      </div>

      {/* 기획전 모드: FeaturedCollections 표시 */}
      {isCollectionMode ? (
        <FeaturedCollections tags={featuredTags} hideQuickBrowse />
      ) : (
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
        />
      )}

      <InfluenceDistributionModal
        isOpen={showInfluenceDistribution}
        onClose={() => setShowInfluenceDistribution(false)}
      />
    </div>
  );
}
