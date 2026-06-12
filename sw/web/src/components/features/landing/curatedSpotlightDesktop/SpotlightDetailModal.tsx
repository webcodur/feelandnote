"use client";

import { lazy, Suspense } from "react";
import type { FeaturedCeleb } from "@/actions/home";

const CelebDetailModal = lazy(() => import("@/components/features/celeb/modals/CelebDetailModal"));

interface SpotlightDetailModalProps {
  modalCeleb: FeaturedCeleb | null;
  modalCelebIndex: number;
  celebs: FeaturedCeleb[];
  setModalCeleb: (celeb: FeaturedCeleb | null) => void;
  setModalCelebIndex: (idx: number) => void;
}

export default function SpotlightDetailModal({
  modalCeleb,
  modalCelebIndex,
  celebs,
  setModalCeleb,
  setModalCelebIndex,
}: SpotlightDetailModalProps) {
  if (!modalCeleb) return null;

  return (
    <Suspense fallback={null}>
      <CelebDetailModal
        celeb={modalCeleb}
        isOpen={!!modalCeleb}
        onClose={() => { setModalCeleb(null); setModalCelebIndex(-1); }}
        onNavigate={(dir) => {
          const idx = dir === "prev" ? modalCelebIndex - 1 : modalCelebIndex + 1;
          if (idx >= 0 && idx < celebs.length) { setModalCelebIndex(idx); setModalCeleb(celebs[idx]); }
        }}
        hasPrev={modalCelebIndex > 0}
        hasNext={modalCelebIndex < celebs.length - 1}
      />
    </Suspense>
  );
}
