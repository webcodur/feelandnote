/*
  파일명: /components/features/user/explore/sections/CelebsSection.tsx
  기능: 셀럽 섹션
  책임: 셀럽 목록을 필터링하여 보여준다.
*/ // ------------------------------

"use client";

import { useState, lazy, Suspense } from "react";
import { BarChart3, Gem } from "lucide-react";
import CelebCarousel from "@/components/features/home/CelebCarousel";
import FeaturedCollectionsDesktop from "@/components/features/landing/FeaturedCollectionsDesktop";
import InfluenceDistributionModal from "../InfluenceDistributionModal";
import Modal, { ModalBody } from "@/components/ui/Modal";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts, FeaturedTag } from "@/actions/home";

const FeaturedCollectionsMobile = lazy(() => import("@/components/features/landing/FeaturedCollectionsMobile"));

interface Props {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
  featuredTags: FeaturedTag[];
}

export default function CelebsSection({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
  featuredTags,
}: Props) {
  const [showInfluenceDistribution, setShowInfluenceDistribution] = useState(false);
  const [isCollectionMode, setIsCollectionMode] = useState(false);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(false);

  // 기획전 버튼 클릭 핸들러 (모바일/데스크톱 분기)
  const handleCollectionClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileModalOpen(true);
    } else {
      setIsCollectionMode(!isCollectionMode);
    }
  };

  // 검색 우측에 배치될 버튼들 (1행 FilterChipDropdown 스타일에 맞춤)
  const extraButtons = (
    <>
      <button
        type="button"
        onClick={() => setShowInfluenceDistribution(true)}
        className="h-9 flex items-center justify-center gap-2 px-3 rounded-md text-xs font-sans font-bold tracking-wider border border-accent/20 bg-accent/5 text-accent/80 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all duration-300 flex-1 md:flex-none md:shrink-0"
      >
        <BarChart3 size={14} className="opacity-70" />
        <span>영향력</span>
      </button>
      {featuredTags.length > 0 && (
        <button
          type="button"
          onClick={handleCollectionClick}
          className={`h-9 flex items-center justify-center gap-2 px-3 rounded-md text-xs font-sans font-bold tracking-wider border transition-all duration-300 flex-1 md:flex-none md:shrink-0 relative overflow-hidden ${
            isCollectionMode
              ? "bg-accent/20 border-accent text-accent shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              : "bg-accent/10 border-accent/40 text-accent hover:bg-accent/20 hover:border-accent shadow-[0_0_10px_rgba(212,175,55,0.15)] animate-pulse"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
          <Gem size={14} className={isCollectionMode ? "text-accent" : "text-accent/80"} />
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
        genderCounts={genderCounts}
        mode="grid"
        hideHeader={false}
        syncToUrl
        extraButtons={extraButtons}
        onFilterInteraction={() => setIsCollectionMode(false)}
        customContent={isCollectionMode ? (
          <FeaturedCollectionsDesktop
            tags={featuredTags}
            activeTagIndex={activeTagIndex}
            setActiveTagIndex={setActiveTagIndex}
            hideQuickBrowse
            location="explore-pc"
          />
        ) : undefined}
        includeInactive={includeInactive}
        onIncludeInactiveChange={setIncludeInactive}
      />

      <InfluenceDistributionModal
        isOpen={showInfluenceDistribution}
        onClose={() => setShowInfluenceDistribution(false)}
      />

      {/* 모바일 기획전 모달 */}
      <Modal
        isOpen={mobileModalOpen}
        onClose={() => setMobileModalOpen(false)}
        title="기획전"
        icon={Gem}
        size="full"
      >
        <ModalBody className="p-0 max-h-[70vh] overflow-y-auto">
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-text-tertiary">로딩 중...</div>}>
            <FeaturedCollectionsMobile
              tags={featuredTags}
              activeTagIndex={activeTagIndex}
              setActiveTagIndex={setActiveTagIndex}
              hideQuickBrowse
            />
          </Suspense>
        </ModalBody>
      </Modal>

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
