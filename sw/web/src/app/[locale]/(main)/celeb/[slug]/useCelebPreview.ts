"use client";

import { useCallback, useRef, useState } from "react";

import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import type { CelebProfile } from "@/types/home";

export function useCelebPreview() {
  const requestIdRef = useRef(0);
  const [celeb, setCeleb] = useState<CelebProfile | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const openCelebPreview = useCallback(async (celebId: string) => {
    const requestId = ++requestIdRef.current;
    setLoadingId(celebId);

    try {
      const nextCeleb = await getCelebForModal(celebId);
      if (requestId !== requestIdRef.current) return null;
      if (nextCeleb) setCeleb(nextCeleb);
      return nextCeleb;
    } catch (error) {
      console.error("[celeb-preview] Failed to load person preview", error);
      return null;
    } finally {
      if (requestId === requestIdRef.current) setLoadingId(null);
    }
  }, []);

  const closeCelebPreview = useCallback(() => {
    requestIdRef.current += 1;
    setLoadingId(null);
    setCeleb(null);
  }, []);

  return {
    celeb,
    loadingId,
    openCelebPreview,
    closeCelebPreview,
  };
}
