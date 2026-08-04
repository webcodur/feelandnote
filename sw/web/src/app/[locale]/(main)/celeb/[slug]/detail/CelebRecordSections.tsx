"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { FactionTagPreview } from "@/actions/home/getFeaturedTags";
import type { SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
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
import {
  type CelebServiceAvailability,
  useCelebServiceItems,
} from "../celebServiceItems";
import UnavailableSectionGuide from "../UnavailableSectionGuide";
import { getLocalizedCelebVideos } from "./celebDetailData";
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
  personaData: SimilarByCelebResult | null;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  dialogueLines?: Record<string, string[]> | null;
  contemporaries: ContemporaryCeleb[];
  timelineEvents: CelebTimelineEvent[];
  factionPreviews: FactionTagPreview[];
  initialContents: GetUserContentsResponse;
  fictionSources: FictionSourceContent[];
}

export default function CelebRecordSections({
  profile,
  userId,
  locale,
  worldId,
  influenceData,
  personaData,
  guestbookEntries,
  guestbookTotal,
  dialogueLines,
  contemporaries,
  timelineEvents,
  factionPreviews,
  initialContents,
  fictionSources,
}: CelebRecordSectionsProps) {
  const t = useTranslations("celebPage");
  const celebTier = profile.celeb_tier ?? "full";
  const isFiction = celebTier === "fiction";
  const showLibrary = celebTier === "full";
  const hasVoice = profile.has_voice ?? false;
  const hasDialogues = Boolean(
    dialogueLines && Object.keys(dialogueLines).length > 0,
  );
  const { longform, shorts } = useMemo(
    () => getLocalizedCelebVideos(profile.youtube_videos, locale),
    [locale, profile.youtube_videos],
  );
  const availability: CelebServiceAvailability = {
    reading: Boolean(profile.reading),
    relations: profile.relations.length > 0,
    timeline: timelineEvents.length > 0,
    contemporaries: contemporaries.length > 0,
    faction: profile.factionTags.length > 0,
    videos: longform.length > 0 || shorts.length > 0,
    dialogues: hasDialogues,
    dialogueVoice: hasDialogues && hasVoice,
    influence: Boolean(influenceData),
    persona: Boolean(personaData?.targetPersona),
    sourceWorks: fictionSources.length > 0,
  };
  const serviceItems = useCelebServiceItems({
    tier: celebTier,
    showLibrary,
    availability,
  });
  const { activeSectionId, navigate } = useCelebSectionNavigation(
    serviceItems.map((item) => item.target.sectionId),
  );
  const worldStyle = getWorldStyle(worldId);
  const numerals = worldStyle.numerals;
  const titleFont = worldStyle.titleFont;
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
        titleFont={titleFont}
      />
    );
  };

  return (
    <div className={styles.recordsGrid}>
      <CelebAtlasNavigation
        items={serviceItems}
        activeSectionId={activeSectionId}
        onNavigate={navigate}
        titleFont={titleFont}
      />

      <div className={styles.sectionStack}>
        <section id="reading" tabIndex={-1} className={SECTION_CLASS_NAME}>
          {renderSectionHeading("reading")}
          <SectionSurface className={TAB_BOX_CLASS_NAME}>
            <FigureReadingTabs
              item={serviceItemsByKey.get("reading")!}
              reading={profile.reading}
            />
          </SectionSurface>
        </section>

        <section
          id={isFiction ? "source-works" : "library"}
          tabIndex={-1}
          className={SECTION_CLASS_NAME}
        >
          {renderSectionHeading(isFiction ? "sourceWorks" : "library")}
          {isFiction ? (
            fictionSources.length > 0 ? (
              <SectionSurface>
                <FictionSourceWorksSection sources={fictionSources} />
              </SectionSurface>
            ) : (
              <SectionSurface>
                <UnavailableSectionGuide
                  item={serviceItemsByKey.get("sourceWorks")!}
                />
              </SectionSurface>
            )
          ) : showLibrary ? (
            <SectionSurface className={TAB_BOX_CLASS_NAME}>
              <LibraryTabs
                userId={userId}
                nickname={profile.nickname}
                emptyMessage={t("libraryEmpty")}
                wikidataQid={profile.wikidata_qid ?? null}
                initialContents={initialContents}
              />
            </SectionSurface>
          ) : (
            <SectionSurface>
              <UnavailableSectionGuide
                item={serviceItemsByKey.get("library")!}
              />
            </SectionSurface>
          )}
        </section>

        <section id="timeline" tabIndex={-1} className={SECTION_CLASS_NAME}>
          {renderSectionHeading("timeline")}
          {timelineEvents.length > 0 ? (
            <SectionSurface>
              <JourneySection events={timelineEvents} />
            </SectionSurface>
          ) : (
            <SectionSurface>
              <UnavailableSectionGuide
                item={serviceItemsByKey.get("timeline")!}
              />
            </SectionSurface>
          )}
        </section>

        <section id="connections" tabIndex={-1} className={SECTION_CLASS_NAME}>
          {renderSectionHeading("connections")}
          <SectionSurface className={TAB_BOX_CLASS_NAME}>
            <PeopleAndEraTabs
              item={serviceItemsByKey.get("connections")!}
              centerName={profile.nickname}
              centerAvatarUrl={profile.avatar_url}
              relations={profile.relations}
              contemporaries={contemporaries}
              factionTags={profile.factionTags}
              factionPreviews={factionPreviews}
              currentCelebId={profile.id}
            />
          </SectionSurface>
        </section>

        <section id="analysis" tabIndex={-1} className={SECTION_CLASS_NAME}>
          {renderSectionHeading("analysis")}
          <SectionSurface className={TAB_BOX_CLASS_NAME}>
            <FigureAnalysisTabs
              item={serviceItemsByKey.get("analysis")!}
              personaData={personaData}
              influenceData={influenceData}
            />
          </SectionSurface>
        </section>

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
            />
          </SectionSurface>
        </section>
      </div>
    </div>
  );
}
