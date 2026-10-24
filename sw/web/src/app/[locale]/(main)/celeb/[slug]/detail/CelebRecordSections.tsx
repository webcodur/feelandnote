/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 순서대로 본문 구획 조립
 * - 목차 위치: 공통 (personGuide/virtualMonologue/library(책장)/analysis/connections/guestbook)
 * - 데이터: profile/serviceModel 및 독립적으로 채워지는 librarySlot/booksSlot
 * - 함께 보기: detail/useCelebServiceModel.ts, CelebAtlasRails.tsx, shared/HubSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

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
import CelebShelfSection from "@/components/features/celeb/CelebShelfSection";
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
  filmographySlot?: ReactNode;
  relatedFiguresSlot?: ReactNode;
  relatedFactionsSlot?: ReactNode;
}

export default function CelebRecordSections({
  profile,
  userId,
  locale,
  initialAnalysis,
  serviceModel,
  librarySlot,
  booksSlot,
  filmographySlot,
  relatedFiguresSlot,
  relatedFactionsSlot,
}: CelebRecordSectionsProps) {
  const filmographyText = useTranslations("celebPage.filmography");
  const [filmographyOpen, setFilmographyOpen] = useState(false);

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
        title={key === "filmography" ? (
          <button
            type="button"
            aria-expanded={filmographyOpen}
            aria-controls="filmography-content"
            onClick={() => setFilmographyOpen((open) => !open)}
            className="relative inline-flex min-h-11 items-center rounded px-8 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {item.label}
            <ChevronDown size={20} aria-hidden className={`absolute right-0 ${filmographyOpen ? "rotate-180" : ""}`} />
          </button>
        ) : item.label}
        index={index}
        total={serviceItems.length}
        tabIndex={-1}
        className={SECTION_CLASS_NAME}
      >
        {key === "filmography" ? (
          <>
            {!filmographyOpen && (
              <button
                type="button"
                aria-expanded={false}
                aria-controls="filmography-content"
                onClick={() => setFilmographyOpen(true)}
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-line bg-bg-card px-5 py-6 text-center hover:border-accent/60 hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-sm leading-relaxed text-text-secondary">{filmographyText("description")}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  {filmographyText("expand")}
                  <ChevronDown size={16} aria-hidden />
                </span>
              </button>
            )}
            <div id="filmography-content" hidden={!filmographyOpen}>
              {filmographyOpen ? children : null}
            </div>
          </>
        ) : children}
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
        {renderSection("library", <CelebShelfSection key={`${userId}:${locale}`} pageAnchors
          hasReviews={!isFiction && (profile.celeb_tier ?? "full") === "full" && Object.values(profile.contentTypeCounts).some((count) => count > 0)}
          librarySlot={librarySlot} booksSlot={booksSlot} />)}
        {renderSection("filmography", filmographySlot)}
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
        {relatedFactionsSlot && renderSection("relatedFactions", relatedFactionsSlot)}
        {renderSection("guestbook", (
          <GuestbookDeferred profileId={userId} isFiction={isFiction} />
        ))}
      </div>
    </div>
  );
}
