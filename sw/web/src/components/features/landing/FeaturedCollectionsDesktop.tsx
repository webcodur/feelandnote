"use client";

import type { FeaturedTag } from "@/actions/home";
import { EXPLORE_PRESETS } from "./constants";
import CuratedExhibitionDesktop from "./CuratedExhibitionDesktop";
import ExploreStackedRowDesktop from "./ExploreStackedRowDesktop";

interface FeaturedCollectionsDesktopProps {
  tags: FeaturedTag[];
  activeTagIndex: number;
  setActiveTagIndex: (index: number) => void;
  hideQuickBrowse?: boolean;
}

export default function FeaturedCollectionsDesktop({
  tags,
  activeTagIndex,
  setActiveTagIndex,
  hideQuickBrowse = false,
}: FeaturedCollectionsDesktopProps) {

  const activeTag = tags.length > 0 ? tags[activeTagIndex] : null;

  return (
    <div className="w-full flex flex-col gap-8 md:gap-12">

      {/* 1. Curated Exhibition (Top) */}
      <div className="w-full flex flex-col relative">
           {activeTag ? (
             <CuratedExhibitionDesktop
               key={activeTag.id}
               activeTag={activeTag}
               tags={tags}
               activeIndex={activeTagIndex}
               onTagChange={setActiveTagIndex}
             />
           ) : (
             <div className="w-full h-96 flex items-center justify-center border border-dashed border-border rounded-2xl bg-bg-card/30">
               <span className="text-text-tertiary font-serif italic">진행 중인 기획전이 없습니다.</span>
             </div>
           )}
      </div>

      {/* 2. Quick Browse (Bottom) - 숨기기 가능 */}
      {!hideQuickBrowse && (
        <div className="w-full flex flex-col gap-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
            {EXPLORE_PRESETS.map((section) => (
              <ExploreStackedRowDesktop key={section.id} section={section} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
