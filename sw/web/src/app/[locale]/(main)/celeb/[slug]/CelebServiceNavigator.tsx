"use client";

import { useTranslations } from "next-intl";

import type { CelebTier } from "@/actions/user/getUserProfile";

import CelebServiceAtlas, { type ServiceItem } from "./CelebServiceAtlas";
import { CELEB_SERVICE_ICONS } from "./celebServiceIcons";
import { CELEB_SERVICE_CHAPTERS } from "./celebSectionChapters";
import styles from "./CelebServiceNavigator.module.css";

export interface ServiceTarget {
  sectionId: string;
}

export interface CelebServiceAvailability {
  relations: boolean;
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
}

export default function CelebServiceNavigator({
  tier,
  showLibrary,
  availability,
  onNavigate,
}: Props) {
  const t = useTranslations("celebPage");

  const items = ([
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
      ready: true,
      eligible: showLibrary,
      target: { sectionId: "library" },
    },
    {
      key: "relations",
      chapter: CELEB_SERVICE_CHAPTERS.relations,
      label: t("relationGraph"),
      icon: CELEB_SERVICE_ICONS.relations,
      ready: availability.relations,
      target: { sectionId: "relations" },
    },
    {
      key: "contemporaries",
      chapter: CELEB_SERVICE_CHAPTERS.contemporaries,
      label: t("contemporaries"),
      icon: CELEB_SERVICE_ICONS.contemporaries,
      ready: availability.contemporaries,
      target: { sectionId: "contemporaries" },
    },
    {
      key: "influence",
      chapter: CELEB_SERVICE_CHAPTERS.influence,
      label: t("influence"),
      icon: CELEB_SERVICE_ICONS.influence,
      ready: availability.influence,
      eligible: tier !== "fiction" && tier !== "relation",
      target: { sectionId: "influence" },
    },
    {
      key: "persona",
      chapter: CELEB_SERVICE_CHAPTERS.persona,
      label: t("analysis"),
      icon: CELEB_SERVICE_ICONS.persona,
      ready: availability.persona,
      eligible: tier !== "fiction" && tier !== "relation",
      target: { sectionId: "persona" },
    },
    {
      key: "virtual-monologue",
      chapter: CELEB_SERVICE_CHAPTERS.virtualMonologue,
      label: t("virtualMonologue"),
      icon: CELEB_SERVICE_ICONS.virtualMonologue,
      ready: availability.virtualMonologue,
      eligible: tier !== "relation",
      target: { sectionId: "virtual-monologue" },
      companion: {
        label: t("serviceMonologueVoice"),
        icon: CELEB_SERVICE_ICONS.virtualMonologueVoice,
        ready: availability.virtualMonologueVoice,
      },
    },
    {
      key: "dialogues",
      chapter: CELEB_SERVICE_CHAPTERS.dialogues,
      label: t("dialogues"),
      icon: CELEB_SERVICE_ICONS.dialogues,
      ready: availability.dialogues,
      eligible: tier !== "relation",
      target: { sectionId: "dialogues" },
      companion: {
        label: t("serviceDialogueVoice"),
        icon: CELEB_SERVICE_ICONS.dialogueVoice,
        ready: availability.dialogueVoice,
      },
    },
    {
      key: "videos",
      chapter: CELEB_SERVICE_CHAPTERS.videos,
      label: t("videos"),
      icon: CELEB_SERVICE_ICONS.videos,
      ready: availability.videos,
      target: { sectionId: "videos" },
    },
    {
      key: "faction",
      chapter: CELEB_SERVICE_CHAPTERS.faction,
      label: t("serviceFaction"),
      icon: CELEB_SERVICE_ICONS.faction,
      ready: availability.faction,
      target: { sectionId: "faction" },
    },
    {
      key: "guestbook",
      chapter: CELEB_SERVICE_CHAPTERS.guestbook,
      label: t("guestbook"),
      icon: CELEB_SERVICE_ICONS.guestbook,
      ready: true,
      target: { sectionId: "guestbook" },
    },
  ] satisfies ServiceItem[]).filter((item) => item.eligible !== false);

  return (
    <nav
      aria-label={t("serviceGuideTitle")}
      className={styles.navigator}
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
