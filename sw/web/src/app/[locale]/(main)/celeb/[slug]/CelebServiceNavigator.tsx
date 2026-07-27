"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { CelebTier } from "@/actions/user/getUserProfile";
import { cn } from "@/lib/utils";

import CelebServiceAtlas, { type ServiceItem } from "./CelebServiceAtlas";
import { CELEB_SERVICE_ICONS } from "./celebServiceIcons";
import { CELEB_SERVICE_CHAPTERS } from "./celebSectionChapters";
import styles from "./CelebServiceNavigator.module.css";

export interface ServiceTarget {
  sectionId: string;
}

export interface CelebServiceAvailability {
  relations: boolean;
  timeline: boolean;
  contemporaries: boolean;
  faction: boolean;
  videos: boolean;
  virtualMonologue: boolean;
  dialogues: boolean;
  dialogueVoice: boolean;
  virtualMonologueVoice: boolean;
  influence: boolean;
  persona: boolean;
}

interface Props {
  tier: CelebTier;
  showLibrary: boolean;
  availability: CelebServiceAvailability;
  onNavigate: (target: ServiceTarget) => void;
  className?: string;
}

interface UseCelebServiceItemsProps {
  tier: CelebTier;
  showLibrary: boolean;
  availability: CelebServiceAvailability;
}

export function useCelebServiceItems({
  tier,
  showLibrary,
  availability,
}: UseCelebServiceItemsProps): ServiceItem[] {
  const t = useTranslations("celebPage");

  return useMemo(
    () => ([
      {
        key: "introduction",
        chapter: CELEB_SERVICE_CHAPTERS.introduction,
        label: t("serviceIntroduction"),
        icon: CELEB_SERVICE_ICONS.introduction,
        ready: true,
        target: { sectionId: "introduction" },
      },
      {
        key: "library",
        chapter: CELEB_SERVICE_CHAPTERS.library,
        label: t("library"),
        icon: CELEB_SERVICE_ICONS.library,
        ready: showLibrary,
        target: { sectionId: "library" },
        unavailableGuide: {
          about: t("atlasGuides.library.about"),
        },
      },
      {
        key: "timeline",
        chapter: CELEB_SERVICE_CHAPTERS.timeline,
        label: t("timeline"),
        icon: CELEB_SERVICE_ICONS.timeline,
        ready: availability.timeline,
        target: { sectionId: "timeline" },
        unavailableGuide: {
          about: t("atlasGuides.timeline.about"),
        },
      },
      {
        key: "connections",
        chapter: CELEB_SERVICE_CHAPTERS.connections,
        label: t("connections"),
        icon: CELEB_SERVICE_ICONS.connections,
        ready:
          availability.relations
          || availability.contemporaries
          || availability.faction,
        target: { sectionId: "connections" },
        unavailableGuide: {
          about: t("atlasGuides.connections.about"),
        },
        children: [
          {
            key: "relations",
            chapter: "04-A",
            label: t("relationGraph"),
            icon: CELEB_SERVICE_ICONS.relations,
            ready: availability.relations,
            target: { sectionId: "connections" },
            unavailableGuide: {
              about: t("atlasGuides.relations.about"),
            },
          },
          {
            key: "contemporaries",
            chapter: "04-B",
            label: t("contemporaries"),
            icon: CELEB_SERVICE_ICONS.contemporaries,
            ready: availability.contemporaries,
            target: { sectionId: "connections" },
            unavailableGuide: {
              about: t("atlasGuides.contemporaries.about"),
            },
          },
          {
            key: "faction",
            chapter: "04-C",
            label: t("serviceFaction"),
            icon: CELEB_SERVICE_ICONS.faction,
            ready: availability.faction,
            target: { sectionId: "connections" },
            unavailableGuide: {
              about: t("atlasGuides.faction.about"),
            },
          },
        ],
      },
      {
        key: "analysis",
        chapter: CELEB_SERVICE_CHAPTERS.analysis,
        label: t("analysis"),
        icon: CELEB_SERVICE_ICONS.analysis,
        ready:
          (availability.persona || availability.influence)
          && tier !== "fiction"
          && tier !== "relation",
        target: { sectionId: "analysis" },
        unavailableGuide: {
          about: t("atlasGuides.analysis.about"),
        },
        children: [
          {
            key: "persona",
            chapter: "05-A",
            label: t("profileAxes"),
            icon: CELEB_SERVICE_ICONS.persona,
            ready:
              availability.persona
              && tier !== "fiction"
              && tier !== "relation",
            target: { sectionId: "analysis" },
            unavailableGuide: {
              about: t("atlasGuides.persona.about"),
            },
          },
          {
            key: "influence",
            chapter: "05-B",
            label: t("influence"),
            icon: CELEB_SERVICE_ICONS.influence,
            ready:
              availability.influence
              && tier !== "fiction"
              && tier !== "relation",
            target: { sectionId: "analysis" },
            unavailableGuide: {
              about: t("atlasGuides.influence.about"),
            },
          },
        ],
      },
      {
        key: "media",
        chapter: CELEB_SERVICE_CHAPTERS.media,
        label: t("media"),
        icon: CELEB_SERVICE_ICONS.media,
        ready:
          availability.videos
          || ((availability.virtualMonologue || availability.dialogues)
            && tier !== "relation"),
        target: { sectionId: "media" },
        unavailableGuide: {
          about: t("atlasGuides.media.about"),
        },
        children: [
          {
            key: "virtual-monologue",
            chapter: "06-A",
            label: t("mediaMonologue"),
            icon: CELEB_SERVICE_ICONS.virtualMonologue,
            ready: availability.virtualMonologue && tier !== "relation",
            target: { sectionId: "media" },
            unavailableGuide: {
              about: t("atlasGuides.virtualMonologue.about"),
            },
            companion: {
              label: t("serviceMonologueVoice"),
              icon: CELEB_SERVICE_ICONS.virtualMonologueVoice,
              ready: availability.virtualMonologueVoice,
            },
          },
          {
            key: "dialogues",
            chapter: "06-B",
            label: t("mediaDialogues"),
            icon: CELEB_SERVICE_ICONS.dialogues,
            ready: availability.dialogues && tier !== "relation",
            target: { sectionId: "media" },
            unavailableGuide: {
              about: t("atlasGuides.dialogues.about"),
            },
            companion: {
              label: t("serviceDialogueVoice"),
              icon: CELEB_SERVICE_ICONS.dialogueVoice,
              ready: availability.dialogueVoice,
            },
          },
          {
            key: "videos",
            chapter: "06-C",
            label: t("mediaVideos"),
            icon: CELEB_SERVICE_ICONS.videos,
            ready: availability.videos,
            target: { sectionId: "media" },
            unavailableGuide: {
              about: t("atlasGuides.videos.about"),
            },
          },
        ],
      },
      {
        key: "guestbook",
        chapter: CELEB_SERVICE_CHAPTERS.guestbook,
        label: t("guestbook"),
        icon: CELEB_SERVICE_ICONS.guestbook,
        ready: true,
        target: { sectionId: "guestbook" },
      },
    ] satisfies ServiceItem[]),
    [
      availability.contemporaries,
      availability.dialogueVoice,
      availability.dialogues,
      availability.faction,
      availability.influence,
      availability.persona,
      availability.relations,
      availability.timeline,
      availability.videos,
      availability.virtualMonologue,
      availability.virtualMonologueVoice,
      showLibrary,
      t,
      tier,
    ],
  );
}

export default function CelebServiceNavigator({
  tier,
  showLibrary,
  availability,
  onNavigate,
  className,
}: Props) {
  const t = useTranslations("celebPage");
  const items = useCelebServiceItems({ tier, showLibrary, availability });

  return (
    <nav
      aria-label={t("serviceGuideTitle")}
      className={cn(styles.navigator, className)}
    >
      <span className={`${styles.corner} ${styles.topStart}`} aria-hidden />
      <span className={`${styles.corner} ${styles.topEnd}`} aria-hidden />
      <span className={`${styles.corner} ${styles.bottomEnd}`} aria-hidden />
      <span className={`${styles.corner} ${styles.bottomStart}`} aria-hidden />

      <div className={styles.heading}>
        <p className="font-serif text-lg tracking-wide text-text-primary">
          {t("serviceGuideTitle")}
        </p>
        <p className="mt-1 text-sm text-text-secondary">{t("serviceGuideDescription")}</p>
      </div>

      <CelebServiceAtlas items={items} onNavigate={onNavigate} />
    </nav>
  );
}
