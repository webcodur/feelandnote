"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import type { CelebTier } from "@/actions/user/getUserProfile";

import { CELEB_SERVICE_ICONS } from "./celebServiceIcons";
import { CELEB_SERVICE_CHAPTERS } from "./celebSectionChapters";

export interface ServiceTarget {
  sectionId: string;
}

export interface ServiceItem {
  key: string;
  chapter: string;
  label: string;
  icon: LucideIcon;
  ready: boolean;
  target: ServiceTarget;
  unavailableGuide?: {
    about: string;
  };
  children?: readonly ServiceItem[];
  companion?: {
    label: string;
    icon: LucideIcon;
    ready: boolean;
  };
}

export interface CelebServiceAvailability {
  reading: boolean;
  relations: boolean;
  timeline: boolean;
  contemporaries: boolean;
  faction: boolean;
  videos: boolean;
  dialogues: boolean;
  dialogueVoice: boolean;
  influence: boolean;
  spectrum: boolean;
  sourceWorks: boolean;
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
        key: "reading",
        chapter: CELEB_SERVICE_CHAPTERS.reading,
        label: t("reading"),
        icon: CELEB_SERVICE_ICONS.reading,
        ready: availability.reading,
        target: { sectionId: "reading" },
        unavailableGuide: {
          about: t("atlasGuides.reading.about"),
        },
        children: [
          {
            key: "person-guide",
            chapter: "02-A",
            label: t("personGuide"),
            icon: CELEB_SERVICE_ICONS.personGuide,
            ready: availability.reading,
            target: { sectionId: "reading" },
            unavailableGuide: {
              about: t("atlasGuides.personGuide.about"),
            },
          },
          {
            key: "person-explore",
            chapter: "02-B",
            label: t("personExplore"),
            icon: CELEB_SERVICE_ICONS.personExplore,
            ready: availability.reading,
            target: { sectionId: "reading" },
            unavailableGuide: {
              about: t("atlasGuides.personExplore.about"),
            },
          },
        ],
      },
      {
        key: tier === "fiction" ? "sourceWorks" : "library",
        chapter: CELEB_SERVICE_CHAPTERS.library,
        label: tier === "fiction" ? t("sourceWorks") : t("library"),
        icon: tier === "fiction"
          ? CELEB_SERVICE_ICONS.sourceWorks
          : CELEB_SERVICE_ICONS.library,
        ready: tier === "fiction" ? availability.sourceWorks : showLibrary,
        target: { sectionId: tier === "fiction" ? "source-works" : "library" },
        unavailableGuide: {
          about: tier === "fiction"
            ? t("atlasGuides.sourceWorks.about")
            : t("atlasGuides.library.about"),
        },
      },
      {
        key: "timeline",
        chapter: CELEB_SERVICE_CHAPTERS.timeline,
        label: tier === "fiction" ? t("fictionTimeline") : t("timeline"),
        icon: CELEB_SERVICE_ICONS.timeline,
        ready: availability.timeline,
        target: { sectionId: "timeline" },
        unavailableGuide: {
          about: tier === "fiction"
            ? t("atlasGuides.fictionTimeline.about")
            : t("atlasGuides.timeline.about"),
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
            chapter: "05-A",
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
            chapter: "05-B",
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
            chapter: "05-C",
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
          (availability.spectrum || availability.influence)
          && tier !== "fiction",
        target: { sectionId: "analysis" },
        unavailableGuide: {
          about: t("atlasGuides.analysis.about"),
        },
        children: [
          {
            key: "spectrum",
            chapter: "06-A",
            label: t("profileAxes"),
            icon: CELEB_SERVICE_ICONS.spectrum,
            ready:
              availability.spectrum
              && tier !== "fiction",
            target: { sectionId: "analysis" },
            unavailableGuide: {
              about: t("atlasGuides.spectrum.about"),
            },
          },
          {
            key: "influence",
            chapter: "06-B",
            label: t("influence"),
            icon: CELEB_SERVICE_ICONS.influence,
            ready:
              availability.influence
              && tier !== "fiction",
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
          || availability.dialogues,
        target: { sectionId: "media" },
        unavailableGuide: {
          about: t("atlasGuides.media.about"),
        },
        children: [
          // 가상 독백 탭은 서비스 노출에서 폐기했다. DB 원문은 제작 재료로만 보존한다.
          {
            key: "dialogues",
            chapter: "07-A",
            label: t("mediaDialogues"),
            icon: CELEB_SERVICE_ICONS.dialogues,
            ready: availability.dialogues,
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
            chapter: "07-B",
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
        label: tier === "fiction" ? t("fictionGuestbook") : t("guestbook"),
        icon: CELEB_SERVICE_ICONS.guestbook,
        ready: true,
        target: { sectionId: "guestbook" },
        unavailableGuide: {
          about: tier === "fiction"
            ? t("atlasGuides.fictionGuestbook.about")
            : t("guestbookCta"),
        },
      },
    ] satisfies ServiceItem[]),
    [
      availability.contemporaries,
      availability.dialogueVoice,
      availability.dialogues,
      availability.faction,
      availability.influence,
      availability.spectrum,
      availability.relations,
      availability.reading,
      availability.sourceWorks,
      availability.timeline,
      availability.videos,
      showLibrary,
      t,
      tier,
    ],
  );
}
