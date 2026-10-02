/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 순서대로 본문 구획 조립
 * - 목차 위치: 공통 (personGuide/virtualMonologue/library(리뷰)/affiliateBooks/analysis/connections/guestbook)
 * - 데이터: profile/figureBooks/serviceModel props
 * - 함께 보기: detail/useCelebServiceModel.ts, CelebAtlasRails.tsx, shared/HubSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { CelebAnalysisData } from "@/actions/celebs/getCelebSideData";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { CelebFactionBookGroup } from "@/actions/celebs/getCelebFactionBooks";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import GuestbookDeferred from "@/components/features/profile/GuestbookDeferred";
import HubSection from "@/components/shared/HubSection";
import type { Locale } from "@/types/locale";

import { CelebAtlasNav } from "../CelebAtlasRails";
import styles from "../CelebPageContent.module.css";

import CelebBookShelf from "@/components/features/celeb/CelebBookShelf";
import FigureReadingSection from "../FigureReadingSection";
import ReviewsSection from "../ReviewsSection";
import FigureAnalysisTabs from "../FigureAnalysisTabs";
import CelebAnalysisRetry from "./CelebAnalysisRetry";
import RelationGraphSection from "../RelationGraphSection";
import type { CelebServiceModel } from "./useCelebServiceModel";
import { useCelebSectionNavigation } from "./useCelebSectionNavigation";

const SECTION_CLASS_NAME = styles.recordSection;

interface CelebRecordSectionsProps {
  profile: CelebBySlugProfile;
  slug: string;
  userId: string;
  locale: Locale;
  initialAnalysis: CelebAnalysisData | null;
  initialContents: GetUserContentsResponse;
  initialContentBrief?: ContentBrief;
  figureBooks: FigureBookContent[];
  authoredBooks: FigureBookContent[];
  /** 「세력」 모드 — 소속 세력·신화별 책 묶음 */
  factionGroups: CelebFactionBookGroup[];
  /** 「직군」 모드 — 같은 직군 동료들이 남긴 기록 중 팔리는 책 */
  professionBooks: AffiliateBook[];
  serviceModel: CelebServiceModel;
  relatedFiguresSlot?: ReactNode;
}

export default function CelebRecordSections({
  profile,
  slug,
  userId,
  locale,
  initialAnalysis,
  initialContents,
  initialContentBrief,
  figureBooks,
  authoredBooks,
  factionGroups,
  professionBooks,
  serviceModel,
  relatedFiguresSlot,
}: CelebRecordSectionsProps) {
  const t = useTranslations("celebPage");

  // 섹션 배치 순서(celebSectionChapters.ts)와 맞춰 FICTION만 이야기 우선 배치를 쓴다.
  // BOTH는 실존 핵심이 있어 표준 배치(분석 뒤 관계)를 쓴다.
  const isFiction = (profile.celeb_reality ?? "REAL") === "FICTION";
  const { items: serviceItems } = serviceModel;
  const { activeSectionId, navigate } = useCelebSectionNavigation(
    serviceItems.map((item) => item.target.sectionId),
  );
  const { serviceItemsByKey, serviceItemIndexByKey } = useMemo(
    () => ({
      serviceItemsByKey: new Map(
        serviceItems.map((item) => [item.key, item]),
      ),
      serviceItemIndexByKey: new Map(
        serviceItems.map((item, index) => [item.key, index]),
      ),
    }),
    [serviceItems],
  );

  /* ── 2. 구획 제목 렌더 ── */
  const renderSection = (key: string, children: ReactNode) => {
    const index = serviceItemIndexByKey.get(key);
    if (index === undefined) return null;
    const item = serviceItems[index];
    return (
      <HubSection
        key={key}
        id={item.target.sectionId}
        title={item.label}
        index={index}
        total={serviceItems.length}
        tabIndex={-1}
        className={SECTION_CLASS_NAME}
      >
        {children}
      </HubSection>
    );
  };

  const connectionsSection = renderSection("connections", (
    <RelationGraphSection
      centerName={profile.nickname}
      centerAvatarUrl={profile.avatar_url}
      relations={profile.relations}
      isFiction={isFiction}
      centerProfile={profile}
    />
  ));

  return (
    <div className={styles.recordsGrid}>
      <CelebAtlasNav
        items={serviceItems}
        activeSectionId={activeSectionId}
        onNavigate={navigate}
      />
      <div className={styles.sectionStack}>
        {(["personGuide", "virtualMonologue"] as const).map((key) => renderSection(key, (
          <FigureReadingSection
            kind={key === "personGuide" ? "guide" : "monologue"}
            reading={profile.reading}
            virtualMonologue={profile.virtualMonologue}
            celebId={userId}
            voiceV={profile.voice_v}
            readingLocale={locale === "en" && !profile.translationFallbacks?.includes("personGuide") ? "en" : "ko"}
            monologueLocale={profile.translationFallbacks?.includes("virtualMonologue") ? (locale === "en" ? "ko" : "en") : locale}
          />
        )))}
        {isFiction && connectionsSection}
        {renderSection("library", (
          <ReviewsSection
            userId={userId}
            slug={slug}
            nickname={profile.nickname}
            avatarUrl={profile.avatar_url}
            emptyMessage={t("libraryEmpty")}
            initialContents={initialContents}
            initialContentBrief={initialContentBrief}
          />
        ))}
        {renderSection("affiliateBooks", (
          <CelebBookShelf
            key={userId}
            celebId={userId}
            appeared={figureBooks}
            authored={authoredBooks}
            professionBooks={professionBooks}
            profession={profile.profession}
            factionGroups={factionGroups}
            id="archive"
          />
        ))}
        {renderSection("analysis", initialAnalysis ? (
          <FigureAnalysisTabs
            item={serviceItemsByKey.get("analysis")!}
            spectrumData={initialAnalysis.spectrum}
            influenceData={initialAnalysis.influence}
            influenceExplorerData={initialAnalysis.influenceExplorer}
            celebId={userId}
          />
        ) : (
          <CelebAnalysisRetry celebId={userId} locale={locale} item={serviceItemsByKey.get("analysis")!} />
        ))}
        {!isFiction && connectionsSection}
        {relatedFiguresSlot && renderSection("relatedFigures", relatedFiguresSlot)}
        {renderSection("guestbook", (
          <GuestbookDeferred profileId={userId} isFiction={isFiction} />
        ))}
      </div>
    </div>
  );
}
