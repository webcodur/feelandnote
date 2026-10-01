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
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { CelebFactionBookGroup } from "@/actions/celebs/getCelebFactionBooks";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
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
  dialogueLines?: Record<string, string[]> | null;
  timelineEvents: CelebTimelineEvent[];
  initialAnalysis: CelebAnalysisData | null;
  /** 목차에 노출할 부가 구획 */
  sideAvailability: CelebSideAvailability;
  initialContents: GetUserContentsResponse;
  initialContentBrief?: ContentBrief;
  figureBooks: FigureBookContent[];
  authoredBooks: FigureBookContent[];
  /** 「감상」 모드 — 감상 기록의 책을 상품 카드로 모은 첫 묶음 */
  readBooks: AffiliateBook[];
  /** 「세력」 모드 — 소속 세력·신화별 책 묶음 */
  factionGroups: CelebFactionBookGroup[];
  /** 서버가 마지막으로 읽은 기록 쪽 다음 */
  readBooksNextPage: number;
  /** 아직 읽지 않은 감상 기록이 있는가 */
  readBooksHasMore: boolean;
  worldId: string;
  worldBannerImages: WorldBannerImages | null;
  externalLinksSlot: ReactNode;
  /** 「직군」 모드 — 같은 직군 동료들이 남긴 기록 중 팔리는 책 */
  professionBooks: AffiliateBook[];
  /** 본문末 구획(이어지는 인물). 서버가 그려 클라이언트가 자리만 받는다 */
  relatedFiguresSlot?: ReactNode;
}

export default function CelebPageContent({
  profile,
  slug,
  shareTitle,
  userId,
  greeting,
  dialogueLines,
  timelineEvents,
  initialAnalysis,
  sideAvailability,
  initialContents,
  initialContentBrief,
  figureBooks,
  authoredBooks,
  readBooks,
  readBooksNextPage,
  readBooksHasMore,
  factionGroups,
  professionBooks,
  worldId,
  worldBannerImages,
  externalLinksSlot,
  relatedFiguresSlot,
}: CelebPageContentProps) {
  const locale = useLocale() as Locale;

  // 인물 화면이 한 장에서 끝나는 원인을 판별하기 위한 구획 열람 집계다.
  const contentRef = useRef<HTMLDivElement>(null);
  /* ── 1. 목차 모델·열람 집계 ── */
  const serviceModel = useCelebServiceModel({
    profile,
    timelineEvents,
    sideAvailability,
    dialogueLines,
    figureBooks,
    authoredBooks,
    readBooks,
    initialContents,
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
        widestLabel={serviceModel.widestSectionLabel}
        externalLinksSlot={externalLinksSlot}
      />

      <CelebRecordSections
        profile={profile}
        slug={slug}
        userId={userId}
        locale={locale}
        dialogueLines={dialogueLines}
        timelineEvents={timelineEvents}
        initialAnalysis={initialAnalysis}
        initialContents={initialContents}
        initialContentBrief={initialContentBrief}
        figureBooks={figureBooks}
        authoredBooks={authoredBooks}
        readBooks={readBooks}
        readBooksNextPage={readBooksNextPage}
        readBooksHasMore={readBooksHasMore}
        factionGroups={factionGroups}
        professionBooks={professionBooks}
        serviceModel={serviceModel}
        relatedFiguresSlot={relatedFiguresSlot}
      />
    </div>
  );
}
