"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLocale } from "next-intl";

import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { InfluenceExplorerData } from "@/actions/home/getInfluenceExplorer";
import type { FeaturedTag } from "@/actions/home/getFeaturedTags";
import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { useSectionViewTracking } from "@/lib/analytics/track";
import type { WorldBannerImages } from "@/lib/celeb/worldImages";
import type { Locale } from "@/types/locale";
import type { GuestbookEntryWithAuthor } from "@/types/database";

import styles from "./CelebPageContent.module.css";
import CelebHeroSection from "./detail/CelebHeroSection";
import CelebRecordSections from "./detail/CelebRecordSections";
import { useCelebServiceModel } from "./detail/useCelebServiceModel";

interface CelebPageContentProps {
  profile: CelebBySlugProfile;
  slug: string;
  shareTitle: string;
  userId: string;
  influenceData: CelebInfluenceDetail | null;
  influenceExplorerData: InfluenceExplorerData | null;
  spectrumData: SimilarByCelebResult | null;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  greeting?: string[] | null;
  dialogueLines?: Record<string, string[]> | null;
  contemporaries: ContemporaryCeleb[];
  timelineEvents: CelebTimelineEvent[];
  factionTags: FeaturedTag[];
  initialContents: GetUserContentsResponse;
  fictionSources: FictionSourceContent[];
  worldId: string;
  worldBannerImages: WorldBannerImages | null;
  children?: ReactNode;
}

export default function CelebPageContent({
  profile,
  slug,
  shareTitle,
  userId,
  influenceData,
  influenceExplorerData,
  spectrumData,
  guestbookEntries,
  guestbookTotal,
  greeting,
  dialogueLines,
  contemporaries,
  timelineEvents,
  factionTags,
  initialContents,
  fictionSources,
  worldId,
  worldBannerImages,
  children,
}: CelebPageContentProps) {
  const locale = useLocale() as Locale;

  // 인물 화면이 한 장에서 끝나는 원인을 판별하기 위한 구획 열람 집계다.
  const contentRef = useRef<HTMLDivElement>(null);
  const serviceModel = useCelebServiceModel({
    profile,
    locale,
    contemporaries,
    timelineEvents,
    factionTags,
    influenceData,
    spectrumData,
    dialogueLines,
    fictionSources,
    initialContents,
  });
  useSectionViewTracking(contentRef);

  useEffect(() => {
    const page = contentRef.current;
    const mainRegion = page?.closest<HTMLElement>("[data-main-content-region]");
    const middleColumn = page?.querySelector<HTMLElement>(
      `.${styles.openingFrame}`,
    );
    if (!page || !mainRegion || !middleColumn) return;

    const positionAtlas = () => {
      const pageBox = page.getBoundingClientRect();
      const regionBox = mainRegion.getBoundingClientRect();
      const middleBox = middleColumn.getBoundingClientRect();
      const leftRegionWidth = Math.max(0, middleBox.left - regionBox.left);
      const centerFromPage =
        regionBox.left + leftRegionWidth / 2 - pageBox.left;
      const atlasWidth = Math.min(160, Math.max(96, leftRegionWidth - 32));

      page.style.setProperty(
        "--celeb-atlas-center-inline",
        `${centerFromPage}px`,
      );
      page.style.setProperty("--celeb-atlas-width", `${atlasWidth}px`);
    };

    positionAtlas();
    const observer = new ResizeObserver(positionAtlas);
    observer.observe(page);
    observer.observe(mainRegion);
    observer.observe(middleColumn);
    window.addEventListener("resize", positionAtlas);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", positionAtlas);
      page.style.removeProperty("--celeb-atlas-center-inline");
      page.style.removeProperty("--celeb-atlas-width");
    };
  }, []);

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
      />

      <CelebRecordSections
        profile={profile}
        userId={userId}
        locale={locale}
        worldId={worldId}
        influenceData={influenceData}
        influenceExplorerData={influenceExplorerData}
        spectrumData={spectrumData}
        guestbookEntries={guestbookEntries}
        guestbookTotal={guestbookTotal}
        dialogueLines={dialogueLines}
        contemporaries={contemporaries}
        timelineEvents={timelineEvents}
        factionTags={factionTags}
        initialContents={initialContents}
        fictionSources={fictionSources}
        serviceModel={serviceModel}
      />

      {children}
    </div>
  );
}
