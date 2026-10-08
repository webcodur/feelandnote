/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 순서대로 본문 구획 조립
 * - 목차 위치: 공통 (personGuide/virtualMonologue/library(리뷰)/affiliateBooks/analysis/connections/guestbook)
 * - 데이터: profile/serviceModel 및 독립적으로 채워지는 librarySlot/booksSlot
 * - 함께 보기: detail/useCelebServiceModel.ts, CelebAtlasRails.tsx, shared/HubSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useMemo, type ReactNode } from "react";

import type { CelebAnalysisData } from "@/actions/celebs/getCelebSideData";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import GuestbookDeferred from "@/components/features/profile/GuestbookDeferred";
import HubSection from "@/components/shared/HubSection";
import type { Locale } from "@/types/locale";

import { CelebAtlasNav } from "../CelebAtlasRails";
import styles from "../CelebPageContent.module.css";

import FigureReadingSection from "../FigureReadingSection";
import FigureAnalysisTabs from "../FigureAnalysisTabs";
import CelebAnalysisRetry from "./CelebAnalysisRetry";
import RelationGraphSection from "../RelationGraphSection";
import type { CelebServiceModel } from "./useCelebServiceModel";
import { useCelebSectionNavigation } from "./useCelebSectionNavigation";

const SECTION_CLASS_NAME = styles.recordSection;

interface CelebRecordSectionsProps {
  profile: CelebBySlugProfile;
  userId: string;
  locale: Locale;
  initialAnalysis: CelebAnalysisData | null;
  serviceModel: CelebServiceModel;
  librarySlot: ReactNode;
  booksSlot: ReactNode;
  relatedFiguresSlot?: ReactNode;
}

export default function CelebRecordSections({
  profile,
  userId,
  locale,
  initialAnalysis,
  serviceModel,
  librarySlot,
  booksSlot,
  relatedFiguresSlot,
}: CelebRecordSectionsProps) {

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
        {renderSection("library", librarySlot)}
        {renderSection("affiliateBooks", booksSlot)}
        {renderSection("analysis", initialAnalysis ? (
          <FigureAnalysisTabs
            item={serviceItemsByKey.get("analysis")!}
            spectrumData={initialAnalysis.spectrum}
            influenceData={initialAnalysis.influence}
            influenceExplorerData={initialAnalysis.influenceExplorer}
            celebId={userId}
          />
        ) : (
          <CelebAnalysisRetry key={`${userId}:${locale}`} celebId={userId} locale={locale} item={serviceItemsByKey.get("analysis")!} />
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
