"use client";

import { useCallback, useRef, useState } from "react";

import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import { trackEvent } from "@/lib/analytics/track";
import type { CelebProfile } from "@/types/home";

/**
 * @param source 겹창을 띄운 칸의 이름. 어느 칸이 인물 탐색으로 이어지는지 집계하는 데 쓴다.
 */
export function useCelebPreview(source?: string) {
  const requestIdRef = useRef(0);
  const [celeb, setCeleb] = useState<CelebProfile | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const openCelebPreview = useCallback(async (celebId: string) => {
    const requestId = ++requestIdRef.current;
    setLoadingId(celebId);

    try {
      const nextCeleb = await getCelebForModal(celebId);
      if (requestId !== requestIdRef.current) return null;
      if (nextCeleb) {
        setCeleb(nextCeleb);
        trackEvent("celeb_person_open", source ? { source } : {});
      }
      return nextCeleb;
    } catch (error) {
      console.error("[celeb-preview] Failed to load person preview", error);
      return null;
    } finally {
      if (requestId === requestIdRef.current) setLoadingId(null);
    }
  }, [source]);

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
