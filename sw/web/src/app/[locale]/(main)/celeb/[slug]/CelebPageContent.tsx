/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 머리말+본문 조립(클라이언트 루트)
 * - 목차 위치: 공통 (머리말/introduction + 전 구획)
 * - 데이터: page.tsx props, useCelebServiceModel 목차
 * - 함께 보기: detail/CelebHeroSection.tsx, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useRef, type ReactNode } from "react";
import { useLocale } from "next-intl";

import type { CelebAnalysisData } from "@/actions/celebs/getCelebSideData";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { useSectionViewTracking } from "@/lib/analytics/track";
import type { WorldBannerImages } from "@/lib/celeb/worldImages";
import type { Locale } from "@/types/locale";

import styles from "./CelebPageContent.module.css";
import CelebHeroSection from "./detail/CelebHeroSection";
import CelebRecordSections from "./detail/CelebRecordSections";
import {
  useCelebServiceModel,
  type CelebSideAvailability,
} from "./detail/useCelebServiceModel";

interface CelebPageContentProps {
  profile: CelebBySlugProfile;
  slug: string;
  shareTitle: string;
  userId: string;
  greeting?: string[] | null;
  initialAnalysis: CelebAnalysisData | null;
  /** 목차에 노출할 부가 구획 */
  sideAvailability: CelebSideAvailability;
  worldId: string;
  worldBannerImages: WorldBannerImages | null;
  externalLinksSlot: ReactNode;
  librarySlot: ReactNode;
  booksSlot: ReactNode;
  /** 본문末 구획(이어지는 인물). 서버가 그려 클라이언트가 자리만 받는다 */
  relatedFiguresSlot?: ReactNode;
}

export default function CelebPageContent({
  profile,
  slug,
  shareTitle,
  userId,
  greeting,
  initialAnalysis,
  sideAvailability,
  worldId,
  worldBannerImages,
  externalLinksSlot,
  librarySlot,
  booksSlot,
  relatedFiguresSlot,
}: CelebPageContentProps) {
  const locale = useLocale() as Locale;

  // 인물 화면이 한 장에서 끝나는 원인을 판별하기 위한 구획 열람 집계다.
  const contentRef = useRef<HTMLDivElement>(null);
  /* ── 1. 목차 모델·열람 집계 ── */
  const serviceModel = useCelebServiceModel({
    profile,
    sideAvailability,
  });
  useSectionViewTracking(contentRef);

  /* ── 2. 머리말·본문 렌더 ── */
  return (
    <div ref={contentRef} className={styles.page}>
      <CelebHeroSection
        profile={profile}
        slug={slug}
        shareTitle={shareTitle}
        greeting={greeting}
        locale={locale}
        worldId={worldId}
        worldBannerImages={worldBannerImages}
        serviceItems={serviceModel.items}
        externalLinksSlot={externalLinksSlot}
      />

      <CelebRecordSections
        profile={profile}
        userId={userId}
        locale={locale}
        initialAnalysis={initialAnalysis}
        librarySlot={librarySlot}
        booksSlot={booksSlot}
        serviceModel={serviceModel}
        relatedFiguresSlot={relatedFiguresSlot}
      />
    </div>
  );
}
