/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 순서대로 본문 구획 조립
 * - 목차 위치: 공통 (reading/timeline/library/sourceWorks/analysis/connections/media/guestbook)
 * - 데이터: profile/timelineEvents/figureBooks/dialogueLines/serviceModel props
 * - 함께 보기: detail/useCelebServiceModel.ts, CelebAtlasRails.tsx, CelebSectionHeading.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import GuestbookDeferred from "@/components/features/profile/GuestbookDeferred";
import { Deferred, PendingBlock } from "@/components/ui/pending";
import type { Locale } from "@/types/locale";

import { CelebAtlasNavigation } from "../CelebAtlasRails";
import styles from "../CelebPageContent.module.css";
import CelebSectionHeading from "../CelebSectionHeading";
import FigureBookWorksSection from "../FigureBookWorksSection";
import FigureMediaTabs from "../FigureMediaTabs";
import FigureReadingTabs from "../FigureReadingTabs";
import JourneySection from "../JourneySection";
import LibraryTabs from "../LibraryTabs";
import CelebAnalysisDeferred from "./CelebAnalysisDeferred";
import CelebConnectionsDeferred from "./CelebConnectionsDeferred";
import type { CelebServiceModel } from "./useCelebServiceModel";
import { useCelebSectionNavigation } from "./useCelebSectionNavigation";

const SECTION_CLASS_NAME = `animate-fade-in ${styles.recordSection}`;

/* ── 1. 구획 공용 표면 — 바깥 상자 규격은 CSS 한 곳(sectionSurface)이 쥔다 ── */
function SectionSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.sectionSurface} ${className}`}>{children}</div>
  );
}

interface CelebRecordSectionsProps {
  profile: CelebBySlugProfile;
  slug: string;
  userId: string;
  locale: Locale;
  dialogueLines?: Record<string, string[]> | null;
  timelineEvents: CelebTimelineEvent[];
  initialContents: GetUserContentsResponse;
  initialContentBrief?: ContentBrief;
  figureBooks: FigureBookContent[];
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
  initialContents,
  initialContentBrief,
  figureBooks,
  serviceModel,
  relatedFiguresSlot,
  affiliateBooksSlot,
}: CelebRecordSectionsProps) {
  const t = useTranslations("celebPage");
  // 섹션 배치 순서(celebSectionChapters.ts)와 맞춰 FICTION만 이야기 우선 배치를 쓴다.
  // BOTH는 실존 핵심이 있어 표준 배치(분석 뒤 관계)를 쓴다.
  const isFiction = (profile.celeb_reality ?? "REAL") === "FICTION";
  const { items: serviceItems, longform, shorts, hasVoice, widestSectionLabel } = serviceModel;
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
        {/* 인물 목록과 세력 화보는 첫 화면 밖이고 검색 본문이 아니라 화면이 다가올 때 불러온다.
            제목은 서버 HTML에 그대로 남는다. */}
        <SectionSurface>
          <Deferred
            fallback={
              <PendingBlock variant="panel" minHeight="min-h-64" className="py-7" />
            }
          >
            <CelebConnectionsDeferred
              slug={slug}
              locale={locale}
              item={serviceItemsByKey.get("connections")!}
              centerName={profile.nickname}
              centerAvatarUrl={profile.avatar_url}
              currentCelebId={profile.id}
              isFiction={isFiction}
            />
          </Deferred>
        </SectionSurface>
      </section>
    );
  };

  return (
    <div className={styles.recordsGrid}>
      <CelebAtlasNavigation
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
              {/* 상자 윗변에서 글을 소폭 떼어 시작한다. 아래 여백과 같은 값으로 맞춘다 */}
              <div className="pt-4 md:pt-6">
                <FigureReadingTabs
                  reading={profile.reading}
                />
              </div>
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
            <SectionSurface>
              <LibraryTabs
                userId={userId}
                nickname={profile.nickname}
                avatarUrl={profile.avatar_url ?? null}
                emptyMessage={t("libraryEmpty")}
                wikidataQid={profile.wikidata_qid ?? null}
                initialContents={initialContents}
                initialContentBrief={initialContentBrief}
              />
            </SectionSurface>
          </section>
        ) : null}

        {serviceItemsByKey.has("sourceWorks") ? (
          <section id="source-works" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("sourceWorks")}
            <SectionSurface>
              <FigureBookWorksSection
                sources={figureBooks}
                nickname={profile.nickname}
              />
            </SectionSurface>
          </section>
        ) : null}

        {/* ── 6. 분석·관계·미디어 ── */}
        {serviceItemsByKey.has("analysis") && (
          <section id="analysis" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("analysis")}
            {/* 점수와 그래프는 첫 화면 밖이고 검색 본문이 아니라 화면이 다가올 때 불러온다 */}
            <SectionSurface>
              <Deferred
                fallback={
                  <PendingBlock variant="panel" minHeight="min-h-64" className="py-7" />
                }
              >
                <CelebAnalysisDeferred
                  celebId={userId}
                  locale={locale}
                  item={serviceItemsByKey.get("analysis")!}
                />
              </Deferred>
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
                longform={longform}
                shorts={shorts}
              />
            </SectionSurface>
          </section>
        )}

        {/* ── 7. 방명록 ── */}
        <section
          id="guestbook"
          tabIndex={-1}
          className={`${SECTION_CLASS_NAME} ${styles.guestbookSection}`}
        >
          {renderSectionHeading("guestbook")}
          {/* 방명록은 색인 가치가 없고 맨 아래에 있으며 캐시에 굳으면 안 되는 자료라
              화면이 다가올 때 비로소 불러온다. 제목은 서버 HTML에 그대로 남는다. */}
          <SectionSurface>
            {/* 방명록은 모드 없이 본문이 바로 오므로 위를 떼어 시작한다 */}
            <div className="pt-4 md:pt-6">
              <Deferred
                fallback={
                  <PendingBlock
                    variant="rows"
                    count={3}
                    className="pb-2 pt-4 sm:pb-3 sm:pt-5 md:pb-4 md:pt-6"
                  />
                }
              >
                <GuestbookDeferred profileId={userId} isFiction={isFiction} />
              </Deferred>
            </div>
          </SectionSurface>
        </section>

        {/* ── 8. 후행 구획 — 서버가 그린 자리를 본문 섹션 형태로 잇는다 ── */}
        {serviceItemsByKey.has("relatedFigures") && relatedFiguresSlot ? (
          <section id="related-figures" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("relatedFigures")}
            <SectionSurface>{relatedFiguresSlot}</SectionSurface>
          </section>
        ) : null}

        {serviceItemsByKey.has("affiliateBooks") && affiliateBooksSlot ? (
          <section id="affiliate-books" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("affiliateBooks")}
            <SectionSurface>{affiliateBooksSlot}</SectionSurface>
          </section>
        ) : null}
      </div>
    </div>
  );
}
