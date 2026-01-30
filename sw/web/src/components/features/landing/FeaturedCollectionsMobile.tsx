"use client";

import { useState, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import { EXPLORE_PRESETS } from "./constants";

import CuratedExhibitionMobile from "./CuratedExhibitionMobile";
import ExploreStackedRowMobile from "./ExploreStackedRowMobile";

const CelebDetailModal = lazy(() => import("@/components/features/home/celeb-card-drafts/CelebDetailModal"));

interface FeaturedCollectionsMobileProps {
  tags: FeaturedTag[];
  activeTagIndex: number;
  setActiveTagIndex: (index: number) => void;
}

export default function FeaturedCollectionsMobile({
  tags,
  activeTagIndex,
  setActiveTagIndex
}: FeaturedCollectionsMobileProps) {
  
  const activeTag = tags.length > 0 ? tags[activeTagIndex] : null;
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);

  return (
    <div className="w-full flex flex-col gap-6 pb-6">
      {/* Curated Exhibition (Horizontal Sticky Tabs) */}
      <div className="w-full">
         <div className="flex overflow-x-auto scrollbar-hidden px-2 mb-4 border-b border-white/5 pb-2 sticky top-0 z-40 bg-bg-main/95 backdrop-blur-sm">
           <div className="flex gap-2">
             {tags.map((tag, idx) => {
               const isActive = activeTagIndex === idx;
               return (
                 <button
                   key={tag.id}
                   onClick={() => setActiveTagIndex(idx)}
                   className={cn(
                     "whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full transition-all",
                     isActive
                       ? "bg-accent text-bg-main font-bold shadow-lg shadow-accent/20"
                       : "bg-white/5 text-text-tertiary border border-white/10"
                   )}
                 >
                   {tag.name}
                 </button>
               );
             })}
           </div>
         </div>

         {/* Mobile Hero Card (Vertical Focus) & List - Refactored to Sub-component */}
         {activeTag && (
           <CuratedExhibitionMobile
              key={activeTag.id}
              activeTag={activeTag}
              onCelebClick={(celeb) => setModalCeleb(celeb)}
           />
         )}
      </div>

      {/* 3. Quick Browse (Interactive 3-Column Decks) */}
      <div className="flex flex-col gap-3 px-2 pt-2 border-t border-white/5">
         <div className="grid grid-cols-3 gap-3">
            {EXPLORE_PRESETS.map((section) => (
              <ExploreStackedRowMobile key={section.id} section={section} />
            ))}
         </div>
      </div>

      {modalCeleb && (
        <Suspense fallback={null}>
          <CelebDetailModal
            celeb={modalCeleb}
            isOpen={!!modalCeleb}
            onClose={() => setModalCeleb(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
