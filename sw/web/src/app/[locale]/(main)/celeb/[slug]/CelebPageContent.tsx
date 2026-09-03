/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 머리말+본문 조립(클라이언트 루트)
 * - 목차 위치: 공통 (머리말/introduction + 전 구획)
 * - 데이터: page.tsx props, useCelebServiceModel 목차
 * - 함께 보기: detail/CelebHeroSection.tsx, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLocale } from "next-intl";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { useSectionViewTracking } from "@/lib/analytics/track";
import type { WorldBannerImages } from "@/lib/celeb/worldImages";
import type { Locale } from "@/types/locale";

import styles from "./CelebPageContent.module.css";
import CelebHeroSection from "./detail/CelebHeroSection";
import CelebRecordSections from "./detail/CelebRecordSections";
import CelebSwipeRail from "./CelebSwipeRail";
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
  dialogueLines?: Record<string, string[]> | null;
  timelineEvents: CelebTimelineEvent[];
  /** 관계·분석 구획은 브라우저가 직접 불러오므로 「있다·없다」만 받는다 */
  sideAvailability: CelebSideAvailability;
  initialContents: GetUserContentsResponse;
  initialContentBrief?: ContentBrief;
  fictionSources: FictionSourceContent[];
  worldId: string;
  worldBannerImages: WorldBannerImages | null;
  externalLinksSlot: ReactNode;
  /** 본문末 구획(이어지는 인물·관련 상품). 서버가 그려 클라이언트가 자리만 받는다 */
  relatedFiguresSlot?: ReactNode;
  affiliateBooksSlot?: ReactNode;
}

export default function CelebPageContent({
  profile,
  slug,
  shareTitle,
  userId,
  greeting,
  dialogueLines,
  timelineEvents,
  sideAvailability,
  initialContents,
  initialContentBrief,
  fictionSources,
  worldId,
  worldBannerImages,
  externalLinksSlot,
  relatedFiguresSlot,
  affiliateBooksSlot,
}: CelebPageContentProps) {
  const locale = useLocale() as Locale;

  // 인물 화면이 한 장에서 끝나는 원인을 판별하기 위한 구획 열람 집계다.
  const contentRef = useRef<HTMLDivElement>(null);
  /* ── 1. 목차 모델·열람 집계 ── */
  const serviceModel = useCelebServiceModel({
    profile,
    locale,
    timelineEvents,
    sideAvailability,
    dialogueLines,
    fictionSources,
    initialContents,
  });
  useSectionViewTracking(contentRef);

  /* ── 2. 아틀라스 위치 실측 ── */
  useEffect(() => {
    const page = contentRef.current;
    const mainRegion = page?.closest<HTMLElement>("[data-main-content-region]");
    const middleColumn = page?.querySelector<HTMLElement>(
      `.${styles.openingFrame}`,
    );
    if (!page || !mainRegion || !middleColumn) return;

    const positionAtlas = () => {
      // 레일은 뷰포트 고정이라 중심도 뷰포트 기준으로 싣는다.
      // 문서Element에 두면 페이지 좌표계와 무관해진다.
      // 기준벽은 region이 아니라 보이는 프레임(main 첫 자식)이다.
      // region 패딩까지 넣으면 중심이 벽 쪽으로 쏠린다.
      const regionBox = mainRegion.getBoundingClientRect();
      const middleBox = middleColumn.getBoundingClientRect();
      const frameBox = mainRegion.closest("main")?.firstElementChild?.getBoundingClientRect() ?? null;
      const wallLeft = frameBox ? frameBox.left : regionBox.left;
      const leftWidth = Math.max(0, middleBox.left - wallLeft);
      const centerViewport = wallLeft + leftWidth / 2;
      const atlasWidth = Math.min(160, Math.max(96, leftWidth - 32));

      document.documentElement.style.setProperty(
        "--celeb-atlas-center-inline",
        `${centerViewport}px`,
      );
      document.documentElement.style.setProperty(
        "--celeb-atlas-width",
        `${atlasWidth}px`,
      );
    };

    // ResizeObserver·window resize가 같은 프레임에 여러 번 울려도
    // 실측(getBoundingClientRect)은 프레임당 최대 1회로 합친다. 계산식은 그대로다.
    let atlasRaf = 0;
    const scheduleAtlas = () => {
      if (atlasRaf) return;
      atlasRaf = requestAnimationFrame(() => {
        atlasRaf = 0;
        positionAtlas();
      });
    };

    positionAtlas();
    const observer = new ResizeObserver(scheduleAtlas);
    observer.observe(page);
    observer.observe(mainRegion);
    observer.observe(middleColumn);
    window.addEventListener("resize", scheduleAtlas);

    return () => {
      if (atlasRaf) cancelAnimationFrame(atlasRaf);
      observer.disconnect();
      window.removeEventListener("resize", scheduleAtlas);
      document.documentElement.style.removeProperty("--celeb-atlas-center-inline");
      document.documentElement.style.removeProperty("--celeb-atlas-width");
    };
  }, []);

  /* ── 3. 머리말·본문 렌더 ── */
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
        widestLabel={serviceModel.widestSectionLabel}
        externalLinksSlot={externalLinksSlot}
      />

      <CelebSwipeRail />

      <CelebRecordSections
        profile={profile}
        slug={slug}
        userId={userId}
        locale={locale}
        dialogueLines={dialogueLines}
        timelineEvents={timelineEvents}
        initialContents={initialContents}
        initialContentBrief={initialContentBrief}
        fictionSources={fictionSources}
        serviceModel={serviceModel}
        relatedFiguresSlot={relatedFiguresSlot}
        affiliateBooksSlot={affiliateBooksSlot}
      />
    </div>
  );
}
