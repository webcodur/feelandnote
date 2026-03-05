"use client";

import { useState, lazy, Suspense } from "react";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";

import CuratedSpotlightMobile from "./CuratedSpotlightMobile";

const CelebDetailModal = lazy(() => import("@/components/features/home/celeb-card-drafts/CelebDetailModal"));

interface FeaturedSpotlightMobileProps {
  activeTag: FeaturedTag | null;
  onSubtitle?: (data: DialogueSubtitleData) => void;
}

export default function FeaturedSpotlightMobile({
  activeTag,
  onSubtitle,
}: FeaturedSpotlightMobileProps) {
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);
  const [modalCelebIndex, setModalCelebIndex] = useState(-1);

  const handleCelebClick = (celeb: FeaturedCeleb) => {
    setModalCeleb(celeb);
    const idx = (activeTag?.celebs ?? []).findIndex(c => c.id === celeb.id);
    setModalCelebIndex(idx);
  };

  const celebList = activeTag?.celebs ?? [];

  if (!activeTag) return null;

  return (
    <div className="w-full flex flex-col gap-6 pb-6">
      <CuratedSpotlightMobile
        key={activeTag.id}
        activeTag={activeTag}
        onCelebClick={handleCelebClick}
        onSubtitle={onSubtitle}
      />

      {modalCeleb && (
        <Suspense fallback={null}>
          <CelebDetailModal
            celeb={modalCeleb}
            isOpen={!!modalCeleb}
            onClose={() => { setModalCeleb(null); setModalCelebIndex(-1); }}
            onNavigate={(dir) => {
              const idx = dir === "prev" ? modalCelebIndex - 1 : modalCelebIndex + 1;
              if (idx >= 0 && idx < celebList.length) { setModalCelebIndex(idx); setModalCeleb(celebList[idx]); }
            }}
            hasPrev={modalCelebIndex > 0}
            hasNext={modalCelebIndex < celebList.length - 1}
          />
        </Suspense>
      )}
    </div>
  );
}
