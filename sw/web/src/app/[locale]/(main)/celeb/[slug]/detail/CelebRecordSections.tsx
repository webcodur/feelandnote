/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 순서대로 본문 구획 조립
 * - 목차 위치: 공통 (reading/timeline/library/sourceWorks/analysis/connections/media/guestbook)
 * - 데이터: profile/timelineEvents/figureBooks/dialogueLines/serviceModel props
 * - 함께 보기: detail/useCelebServiceModel.ts, CelebAtlasRails.tsx, CelebSectionHeading.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { CelebAnalysisData } from "@/actions/celebs/getCelebSideData";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import GuestbookDeferred from "@/components/features/profile/GuestbookDeferred";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import type { Locale } from "@/types/locale";

import { CelebAtlasBottomBar, CelebExploreNavigation } from "../CelebAtlasRails";
import styles from "../CelebPageContent.module.css";
import CelebSectionHeading from "../CelebSectionHeading";
import FigureBookWorksSection from "../FigureBookWorksSection";
import FigureMediaTabs from "../FigureMediaTabs";
import FigureReadingTabs from "../FigureReadingTabs";
import JourneySection from "../JourneySection";
import LibraryTabs from "../LibraryTabs";
import FigureAnalysisTabs from "../FigureAnalysisTabs";
import CelebAnalysisRetry from "./CelebAnalysisRetry";
import PeopleAndEraTabs from "../PeopleAndEraTabs";
import type { CelebServiceModel } from "./useCelebServiceModel";
import { useCelebSectionNavigation } from "./useCelebSectionNavigation";

const SECTION_CLASS_NAME = styles.recordSection;

/* ── 1. 구획 공용 표면 — 바깥 상자 규격은 CSS 한 곳(sectionSurface)이 쥔다 ── */
function SectionSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.sectionSurface} ${className}`}>
      <AnimatedHeight disabled>{children}</AnimatedHeight>
    </div>
  );
}

interface CelebRecordSectionsProps {
  profile: CelebBySlugProfile;
  slug: string;
  userId: string;
  locale: Locale;
  dialogueLines?: Record<string, string[]> | null;
  timelineEvents: CelebTimelineEvent[];
  initialAnalysis: CelebAnalysisData | null;
  initialContents: GetUserContentsResponse;
  initialContentBrief?: ContentBrief;
  figureBooks: FigureBookContent[];
  authoredBooks: FigureBookContent[];
  serviceModel: CelebServiceModel;
  relatedFiguresSlot?: ReactNode;
  affiliateBooksSlot?: ReactNode;
}

export default function CelebRecordSections({
  profile,
  slug,
  userId,
  locale,
  dialogueLines,
  timelineEvents,
  initialAnalysis,
  initialContents,
  initialContentBrief,
  figureBooks,
  authoredBooks,
  serviceModel,
  relatedFiguresSlot,
  affiliateBooksSlot,
}: CelebRecordSectionsProps) {
  const t = useTranslations("celebPage");
  // 섹션 배치 순서(celebSectionChapters.ts)와 맞춰 FICTION만 이야기 우선 배치를 쓴다.
  // BOTH는 실존 핵심이 있어 표준 배치(분석 뒤 관계)를 쓴다.
  const isFiction = (profile.celeb_reality ?? "REAL") === "FICTION";
  const { items: serviceItems, hasVoice, widestSectionLabel } = serviceModel;
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
  const renderSectionHeading = (key: string) => {
    const index = serviceItemIndexByKey.get(key);
    if (index === undefined) return null;

    const item = serviceItems[index];
    const isFirst = index === 0;
    const isLast = index === serviceItems.length - 1;
    return (
      <CelebSectionHeading
        item={item}
        previousItem={serviceItems[index - 1]}
        nextItem={serviceItems[index + 1]}
        onNavigate={navigate}
        widestLabel={widestSectionLabel}
        loopTarget={
          isFirst
            ? serviceItems[serviceItems.length - 1]?.target
            : isLast
              ? serviceItems[0]?.target
              : undefined
        }
      />
    );
  };

  /* ── 3. 관계 구획 렌더 ── */
  const renderConnectionsSection = () => {
    if (!serviceItemsByKey.has("connections")) return null;

    return (
      <section id="connections" tabIndex={-1} className={SECTION_CLASS_NAME}>
        {renderSectionHeading("connections")}
        <SectionSurface>
          <PeopleAndEraTabs
            item={serviceItemsByKey.get("connections")!}
            centerName={profile.nickname}
            centerAvatarUrl={profile.avatar_url}
            relations={profile.relations}
            currentCelebId={profile.id}
            isFiction={isFiction}
            centerProfile={profile}
            slug={slug}
          />
        </SectionSurface>
      </section>
    );
  };

  return (
    <div className={styles.recordsGrid}>
      <CelebExploreNavigation
        items={serviceItems}
        activeSectionId={activeSectionId}
        onNavigate={navigate}
      />
      {/* 옆 레일이 서지 않는 좁은 화면에서 같은 목차를 하단 띠로 쥔다 */}
      <CelebAtlasBottomBar
        items={serviceItems}
        activeSectionId={activeSectionId}
        onNavigate={navigate}
      />

      <div className={styles.sectionStack}>
        {/* ── 4. 읽어보기·연표 ── */}
        {serviceItemsByKey.has("reading") && (
          <section id="reading" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("reading")}
            <SectionSurface>
              {/* 윗여백은 FigureReadingTabs가 쥔다. 모드 탭이 서면 탭이 상자 윗변에 붙는다 */}
              <FigureReadingTabs
                reading={profile.reading}
                virtualMonologue={profile.virtualMonologue}
                celebId={userId}
                voiceV={profile.voice_v}
                readingLocale={locale === "en" && !profile.translationFallbacks?.includes("personGuide") ? "en" : "ko"}
                monologueLocale={profile.translationFallbacks?.includes("virtualMonologue") ? (locale === "en" ? "ko" : "en") : locale}
              />
            </SectionSurface>
          </section>
        )}

        {serviceItemsByKey.has("timeline") && (
          <section id="timeline" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("timeline")}
            <SectionSurface>
              <JourneySection events={timelineEvents} />
            </SectionSurface>
          </section>
        )}

        {isFiction && renderConnectionsSection()}

        {/* ── 5. 서재·원전 ── */}
        {serviceItemsByKey.has("library") ? (
          <section id="library" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("library")}
            <SectionSurface className={styles.librarySurface}>
              <LibraryTabs
                userId={userId}
                slug={slug}
                nickname={profile.nickname}
                avatarUrl={profile.avatar_url}
                emptyMessage={t("libraryEmpty")}
                wikidataQid={profile.wikidata_qid ?? null}
                authoredBooks={authoredBooks}
                initialContents={initialContents}
                initialContentBrief={initialContentBrief}
              />
            </SectionSurface>
          </section>
        ) : null}

        {serviceItemsByKey.has("sourceWorks") ? (
          <section id="source-works" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("sourceWorks")}
            <SectionSurface className={styles.sourceWorksSurface}>
              <FigureBookWorksSection sources={figureBooks} />
            </SectionSurface>
          </section>
        ) : null}

        {/* ── 6. 분석·관계·미디어 ── */}
        {serviceItemsByKey.has("analysis") && (
          <section id="analysis" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("analysis")}
            <SectionSurface>
              {initialAnalysis ? <FigureAnalysisTabs
                item={serviceItemsByKey.get("analysis")!}
                spectrumData={initialAnalysis.spectrum}
                influenceData={initialAnalysis.influence}
                influenceExplorerData={initialAnalysis.influenceExplorer}
                celebId={userId}
              /> : <CelebAnalysisRetry celebId={userId} locale={locale} item={serviceItemsByKey.get("analysis")!} />}
            </SectionSurface>
          </section>
        )}

        {!isFiction && renderConnectionsSection()}

        {serviceItemsByKey.has("media") && (
          <section id="media" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("media")}
            <SectionSurface>
              <FigureMediaTabs
                item={serviceItemsByKey.get("media")!}
                dialogueLines={dialogueLines}
                nickname={profile.nickname}
                avatarUrl={profile.avatar_url}
                hasVoice={hasVoice}
                celebId={userId}
                voiceV={profile.voice_v}
                voiceSpeed={profile.voice_speed}
              />
            </SectionSurface>
          </section>
        )}

        {/* ── 7. 후행 구획 — 참고도서·관련 인물·방명록 순으로 페이지 끝을 닫는다 ── */}
        {serviceItemsByKey.has("affiliateBooks") && affiliateBooksSlot ? (
          <section id="affiliate-books" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("affiliateBooks")}
            <SectionSurface>{affiliateBooksSlot}</SectionSurface>
          </section>
        ) : null}

        {serviceItemsByKey.has("relatedFigures") && relatedFiguresSlot ? (
          <section id="related-figures" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("relatedFigures")}
            <SectionSurface>{relatedFiguresSlot}</SectionSurface>
          </section>
        ) : null}

        {/* 실시간 방명록은 사용자가 펼칠 때 조회한다. */}
        <section
          id="guestbook"
          tabIndex={-1}
          className={`${SECTION_CLASS_NAME} ${styles.guestbookSection}`}
        >
          {renderSectionHeading("guestbook")}
          <SectionSurface>
            {/* 방명록은 모드 없이 본문이 바로 오므로 위를 떼어 시작한다 */}
            <div className="pt-4 md:pt-6">
              <GuestbookDeferred profileId={userId} isFiction={isFiction} />
            </div>
          </SectionSurface>
        </section>
      </div>
    </div>
  );
}
