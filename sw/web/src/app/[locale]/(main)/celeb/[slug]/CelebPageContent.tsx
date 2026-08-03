"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";

import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { FactionTagPreview } from "@/actions/home/getFeaturedTags";
import type { SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { useSectionViewTracking } from "@/lib/analytics/track";
import type { WorldBannerImages } from "@/lib/celeb/worldImages";
import type { Locale } from "@/types/locale";
import type { GuestbookEntryWithAuthor } from "@/types/database";

import styles from "./CelebPageContent.module.css";
import CelebHeroSection from "./detail/CelebHeroSection";
import CelebRecordSections from "./detail/CelebRecordSections";

interface CelebPageContentProps {
  profile: CelebBySlugProfile;
  slug: string;
  shareTitle: string;
  userId: string;
  influenceData: CelebInfluenceDetail | null;
  personaData: SimilarByCelebResult | null;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  greeting?: string[] | null;
  dialogueLines?: Record<string, string[]> | null;
  contemporaries: ContemporaryCeleb[];
  timelineEvents: CelebTimelineEvent[];
  factionPreviews: FactionTagPreview[];
  initialContents: GetUserContentsResponse;
  fictionSources: FictionSourceContent[];
  worldId: string;
  worldBannerImages: WorldBannerImages | null;
}

export default function CelebPageContent({
  profile,
  slug,
  shareTitle,
  userId,
  influenceData,
  personaData,
  guestbookEntries,
  guestbookTotal,
  greeting,
  dialogueLines,
  contemporaries,
  timelineEvents,
  factionPreviews,
  initialContents,
  fictionSources,
  worldId,
  worldBannerImages,
}: CelebPageContentProps) {
  const locale = useLocale() as Locale;

  // 인물 화면이 한 장에서 끝나는 원인을 판별하기 위한 구획 열람 집계다.
  const contentRef = useRef<HTMLDivElement>(null);
  useSectionViewTracking(contentRef);

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
      />

      <CelebRecordSections
        profile={profile}
        userId={userId}
        locale={locale}
        worldId={worldId}
        influenceData={influenceData}
        personaData={personaData}
        guestbookEntries={guestbookEntries}
        guestbookTotal={guestbookTotal}
        dialogueLines={dialogueLines}
        contemporaries={contemporaries}
        timelineEvents={timelineEvents}
        factionPreviews={factionPreviews}
        initialContents={initialContents}
        fictionSources={fictionSources}
      />
    </div>
  );
}
