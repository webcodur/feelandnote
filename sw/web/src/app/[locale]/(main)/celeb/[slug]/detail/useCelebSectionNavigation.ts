/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 구획 스크롤 이동·현재 구획 추적
 * - 목차 위치: 공통 (목차 내비게이션)
 * - 실체는 lib/scroll/useSectionNavigation — 여기서는 인물 측정과 목표 형태만 맞춘다
 * - 함께 보기: celebServiceItems.ts, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback } from "react";

import { trackEvent } from "@/lib/analytics/track";
import { navigateToSection, useSectionNavigation } from "@/lib/scroll/useSectionNavigation";

import type { ServiceTarget } from "../celebServiceItems";

export function navigateToCelebSection(target: ServiceTarget) {
  trackEvent("celeb_guide_click", { section: target.sectionId });
  navigateToSection(target.sectionId);
}

export function useCelebSectionNavigation(sectionIds: string[]) {
  const { activeSectionId, navigate: go } = useSectionNavigation(sectionIds);

  const navigate = useCallback(
    (target: ServiceTarget) => {
      trackEvent("celeb_guide_click", { section: target.sectionId });
      go(target.sectionId);
    },
    [go],
  );

  return { activeSectionId, navigate };
}
