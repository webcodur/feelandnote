/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 순서대로 본문 구획 조립
 * - 목차 위치: 공통 (reading/timeline/library(리뷰)/affiliateBooks/analysis/connections/media/guestbook)
 * - 데이터: profile/timelineEvents/figureBooks/dialogueLines/serviceModel props
 * - 함께 보기: detail/useCelebServiceModel.ts, CelebAtlasRails.tsx, CelebSectionHeading.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { CelebAnalysisData } from "@/actions/celebs/getCelebSideData";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { CelebFactionBookGroup } from "@/actions/celebs/getCelebFactionBooks";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import GuestbookDeferred from "@/components/features/profile/GuestbookDeferred";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import type { Locale } from "@/types/locale";

import { CelebAtlasNav } from "../CelebAtlasRails";
import styles from "../CelebPageContent.module.css";
import CelebSectionHeading from "../CelebSectionHeading";

import CelebBookShelf from "@/components/features/celeb/CelebBookShelf";
import FigureMediaTabs from "../FigureMediaTabs";
import FigureReadingTabs from "../FigureReadingTabs";
import JourneySection from "../JourneySection";
import ReviewsSection from "../ReviewsSection";
import FigureAnalysisTabs from "../FigureAnalysisTabs";
import CelebAnalysisRetry from "./CelebAnalysisRetry";
import PeopleAndEraTabs from "../PeopleAndEraTabs";
import type { CelebServiceModel } from "./useCelebServiceModel";
import { useCelebSectionNavigation } from "./useCelebSectionNavigation";
import type { ContentFocusRequest } from "@/components/features/user/contentLibrary/types";
import { scrollToSection } from "@/lib/scroll/sectionNavigation";

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
  readBooks: AffiliateBook[];
  /** 「세력」 모드 — 소속 세력·신화별 책 묶음 */
  factionGroups: CelebFactionBookGroup[];
  /** 서버가 마지막으로 읽은 기록 쪽 다음 — 「감상」 모드의 「더 보기」가 이어 묻는다 */
  readBooksNextPage: number;
  /** 아직 읽지 않은 감상 기록이 있는가 — 「감상」 모드의 「더 보기」를 결정한다 */
  readBooksHasMore: boolean;
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
  dialogueLines,
  timelineEvents,
  initialAnalysis,
  initialContents,
  initialContentBrief,
  figureBooks,
  authoredBooks,
  readBooks,
  readBooksNextPage,
  readBooksHasMore,
  factionGroups,
  professionBooks,
  serviceModel,
  relatedFiguresSlot,
}: CelebRecordSectionsProps) {
  const t = useTranslations("celebPage");

  // 섹션 배치 순서(celebSectionChapters.ts)와 맞춰 FICTION만 이야기 우선 배치를 쓴다.
  // BOTH는 실존 핵심이 있어 표준 배치(분석 뒤 관계)를 쓴다.
  const isFiction = (profile.celeb_reality ?? "REAL") === "FICTION";
  const { items: serviceItems, hasVoice, widestSectionLabel } = serviceModel;
  const { activeSectionId, navigate } = useCelebSectionNavigation(
    serviceItems.map((item) => item.target.sectionId),
  );
  const [reviewFocus, setReviewFocus] = useState<ContentFocusRequest>();
  const openBookReview = useCallback((contentId: string) => {
    setReviewFocus({ contentId, category: "book" });
    navigate({ sectionId: "library" });
  }, [navigate]);
  const finishBookReview = useCallback((request: ContentFocusRequest) => {
    setReviewFocus((current) => current === request ? undefined : current);
    window.requestAnimationFrame(() => {
      const card = document.getElementById("library")?.querySelector<HTMLElement>(
        `[data-expand-content-id="${request.contentId}"]`,
      );
      if (card) scrollToSection(card);
    });
  }, []);
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
      {/* 넓은 화면은 옆 레일, 좁은 화면은 하단 띠 — 같은 목차의 두 모습 */}
      <CelebAtlasNav
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

        {/* ── 5. 리뷰·참고도서 ── */}
        {serviceItemsByKey.has("library") ? (
          <section id="library" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("library")}
            <SectionSurface className={styles.librarySurface}>
              <ReviewsSection
                userId={userId}
                slug={slug}
                nickname={profile.nickname}
                avatarUrl={profile.avatar_url}
                emptyMessage={t("libraryEmpty")}
                initialContents={initialContents}
                initialContentBrief={initialContentBrief}
                focusRequest={reviewFocus}
                onFocusComplete={finishBookReview}
              />
            </SectionSurface>
          </section>
        ) : null}

        {/* 참고도서 — 인물과 책의 관계로 나눈 모드 탭. 자료가 있는 모드만 세운다 */}
        {serviceItemsByKey.has("affiliateBooks") ? (
          <section id="affiliate-books" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("affiliateBooks")}
            <SectionSurface className={styles.sourceWorksSurface}>
              <CelebBookShelf key={userId} celebId={userId} appeared={figureBooks} authored={authoredBooks}
                read={{ books: readBooks, nextPage: readBooksNextPage, hasMore: readBooksHasMore }}
                professionBooks={professionBooks} profession={profile.profession} factionGroups={factionGroups} id="archive"
                onOpenReview={serviceItemsByKey.has("library") ? openBookReview : undefined} />
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

        {/* ── 7. 후행 구획 — 관련 인물·방명록 순으로 페이지 끝을 닫는다 ── */}
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
