"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { InfluenceExplorerData } from "@/actions/home/getInfluenceExplorer";
import type { FeaturedTag } from "@/actions/home/getFeaturedTags";
import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import {
  formatSectionNumber,
  getWorldStyle,
} from "@/lib/celeb/worldStyle";
import type { Locale } from "@/types/locale";
import type { GuestbookEntryWithAuthor } from "@/types/database";

import { CelebAtlasNavigation } from "../CelebAtlasRails";
import styles from "../CelebPageContent.module.css";
import CelebSectionHeading from "../CelebSectionHeading";
import FictionSourceWorksSection from "../FictionSourceWorksSection";
import FigureAnalysisTabs from "../FigureAnalysisTabs";
import FigureMediaTabs from "../FigureMediaTabs";
import FigureReadingTabs from "../FigureReadingTabs";
import JourneySection from "../JourneySection";
import LibraryTabs from "../LibraryTabs";
import PeopleAndEraTabs from "../PeopleAndEraTabs";
import type { CelebServiceModel } from "./useCelebServiceModel";
import { useCelebSectionNavigation } from "./useCelebSectionNavigation";

const SECTION_CLASS_NAME = `animate-fade-in ${styles.recordSection}`;
const TAB_BOX_CLASS_NAME = "pt-0 md:pt-0";

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
  userId: string;
  locale: Locale;
  worldId: string;
  influenceData: CelebInfluenceDetail | null;
  influenceExplorerData: InfluenceExplorerData | null;
  spectrumData: SimilarByCelebResult | null;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  dialogueLines?: Record<string, string[]> | null;
  contemporaries: ContemporaryCeleb[];
  timelineEvents: CelebTimelineEvent[];
  factionTags: FeaturedTag[];
  initialContents: GetUserContentsResponse;
  fictionSources: FictionSourceContent[];
  serviceModel: CelebServiceModel;
}

export default function CelebRecordSections({
  profile,
  userId,
  locale,
  worldId,
  influenceData,
  influenceExplorerData,
  spectrumData,
  guestbookEntries,
  guestbookTotal,
  dialogueLines,
  contemporaries,
  timelineEvents,
  factionTags,
  initialContents,
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
            <SectionSurface className={TAB_BOX_CLASS_NAME}>
              <FigureReadingTabs
                item={serviceItemsByKey.get("reading")!}
                reading={profile.reading}
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
            <SectionSurface className={TAB_BOX_CLASS_NAME}>
              <PeopleAndEraTabs
                item={serviceItemsByKey.get("connections")!}
                centerName={profile.nickname}
                centerAvatarUrl={profile.avatar_url}
                relations={profile.relations}
                contemporaries={contemporaries}
                factions={factionTags}
                currentCelebId={profile.id}
                isFiction={isFiction}
              />
            </SectionSurface>
          </section>
        )}

        {serviceItemsByKey.has("analysis") && (
          <section id="analysis" tabIndex={-1} className={SECTION_CLASS_NAME}>
            {renderSectionHeading("analysis")}
            <SectionSurface className={TAB_BOX_CLASS_NAME}>
              <FigureAnalysisTabs
                item={serviceItemsByKey.get("analysis")!}
                spectrumData={spectrumData}
                influenceData={influenceData}
                influenceExplorerData={influenceExplorerData}
              />
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
          <SectionSurface>
            <GuestbookContent
              profileId={userId}
              isOwner={false}
              initialEntries={guestbookEntries}
              initialTotal={guestbookTotal}
              hideEmptyState
              isFiction={isFiction}
              variant="celeb"
            />
          </SectionSurface>
        </section>
      </div>
    </div>
  );
}
