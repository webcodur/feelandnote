"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import GuestbookDeferred from "@/components/features/profile/GuestbookDeferred";
import { Deferred, PendingBlock } from "@/components/ui/pending";
import {
  formatSectionNumber,
  getWorldStyle,
} from "@/lib/celeb/worldStyle";
import type { Locale } from "@/types/locale";

import { CelebAtlasNavigation } from "../CelebAtlasRails";
import styles from "../CelebPageContent.module.css";
import CelebSectionHeading from "../CelebSectionHeading";
import FictionSourceWorksSection from "../FictionSourceWorksSection";
import FigureMediaTabs from "../FigureMediaTabs";
import FigureReadingTabs from "../FigureReadingTabs";
import JourneySection from "../JourneySection";
import LibraryTabs from "../LibraryTabs";
import CelebAnalysisDeferred from "./CelebAnalysisDeferred";
import CelebConnectionsDeferred from "./CelebConnectionsDeferred";
import type { CelebServiceModel } from "./useCelebServiceModel";
import { useCelebSectionNavigation } from "./useCelebSectionNavigation";

const SECTION_CLASS_NAME = `animate-fade-in ${styles.recordSection}`;
const TAB_BOX_CLASS_NAME = "pt-0 md:pt-0";
// 탭 없이 글만 담는 상자 — 여백과 그 근거는 CelebPageContent.module.css의 .proseSurface에 있다
const PROSE_BOX_CLASS_NAME = styles.proseSurface;

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
  worldId: string;
  dialogueLines?: Record<string, string[]> | null;
  timelineEvents: CelebTimelineEvent[];
  initialContents: GetUserContentsResponse;
  initialContentBrief?: ContentBrief;
  fictionSources: FictionSourceContent[];
  serviceModel: CelebServiceModel;
}

export default function CelebRecordSections({
  profile,
  slug,
  userId,
  locale,
  worldId,
  dialogueLines,
  timelineEvents,
  initialContents,
  initialContentBrief,
  fictionSources,
  serviceModel,
}: CelebRecordSectionsProps) {
  const t = useTranslations("celebPage");
  const isFiction = (profile.celeb_tier ?? "full") === "fiction";
  const { items: serviceItems, longform, shorts, hasVoice } = serviceModel;
  const { activeSectionId, navigate } = useCelebSectionNavigation(
    serviceItems.map((item) => item.target.sectionId),
  );
  const worldStyle = getWorldStyle(worldId);
  const numerals = worldStyle.numerals;
  const { serviceItemsByKey, serviceItemIndexByKey, widestSectionLabel } =
    useMemo(
      () => ({
        serviceItemsByKey: new Map(
          serviceItems.map((item) => [item.key, item]),
        ),
        serviceItemIndexByKey: new Map(
          serviceItems.map((item, index) => [item.key, index]),
        ),
        widestSectionLabel: serviceItems.reduce(
          (widest, item) =>
            item.label.length > widest.length ? item.label : widest,
          "",
        ),
      }),
      [serviceItems],
    );

  const renderSectionHeading = (key: string) => {
    const index = serviceItemIndexByKey.get(key);
    if (index === undefined) return null;

    const item = serviceItems[index];
    return (
      <CelebSectionHeading
        item={item}
        previousItem={serviceItems[index - 1]}
        nextItem={serviceItems[index + 1]}
        onNavigate={navigate}
        chapterLabel={formatSectionNumber(Number(item.chapter), numerals)}
        numerals={numerals}
        widestLabel={widestSectionLabel}
      />
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
        {serviceItemsByKey.has("reading") && (
          <section id="reading" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("reading")}
            <SectionSurface className={PROSE_BOX_CLASS_NAME}>
              <FigureReadingTabs
                item={serviceItemsByKey.get("reading")!}
                reading={profile.reading}
                name={profile.nickname}
                wikidataQid={profile.wikidata_qid ?? null}
              />
            </SectionSurface>
          </section>
        )}

        {serviceItemsByKey.has(isFiction ? "sourceWorks" : "library") && (
          <section
            id={isFiction ? "source-works" : "library"}
            tabIndex={-1}
            className={SECTION_CLASS_NAME}
          >
            {renderSectionHeading(isFiction ? "sourceWorks" : "library")}
            {isFiction ? (
              <SectionSurface>
                <FictionSourceWorksSection sources={fictionSources} />
              </SectionSurface>
            ) : (
              <SectionSurface className={TAB_BOX_CLASS_NAME}>
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
            )}
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

        {serviceItemsByKey.has("connections") && (
          <section id="connections" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("connections")}
            {/* 인물 목록과 세력 화보는 첫 화면 밖이고 검색 본문이 아니라 화면이 다가올 때 불러온다.
                제목은 서버 HTML에 그대로 남는다. */}
            <SectionSurface className={TAB_BOX_CLASS_NAME}>
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
        )}

        {serviceItemsByKey.has("analysis") && (
          <section id="analysis" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("analysis")}
            {/* 점수와 그래프는 첫 화면 밖이고 검색 본문이 아니라 화면이 다가올 때 불러온다 */}
            <SectionSurface className={TAB_BOX_CLASS_NAME}>
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

        {serviceItemsByKey.has("media") && (
          <section id="media" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("media")}
            <SectionSurface className={TAB_BOX_CLASS_NAME}>
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

        <section id="guestbook" tabIndex={-1} className={SECTION_CLASS_NAME}>
          {renderSectionHeading("guestbook")}
          {/* 방명록은 색인 가치가 없고 맨 아래에 있으며 캐시에 굳으면 안 되는 자료라
              화면이 다가올 때 비로소 불러온다. 제목은 서버 HTML에 그대로 남는다. */}
          <SectionSurface>
            <Deferred
              fallback={
                <PendingBlock variant="rows" count={3} className="py-7" />
              }
            >
              <GuestbookDeferred profileId={userId} isFiction={isFiction} />
            </Deferred>
          </SectionSurface>
        </section>
      </div>
    </div>
  );
}
