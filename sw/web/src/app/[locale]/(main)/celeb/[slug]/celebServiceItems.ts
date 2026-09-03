/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 아이템 정의·정렬
 * - 목차 위치: 공통 (전 구획)
 * - 데이터: tier/showLibrary/availability props, next-intl celebPage
 * - 함께 보기: celebSectionChapters.ts, celebServiceIcons.ts, detail/useCelebServiceModel.ts
 * ───────────────────────────────────────────── */
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import type { CelebTier } from "@/actions/user/getUserProfile";

import { CELEB_SERVICE_ICONS } from "./celebServiceIcons";
import {
  CELEB_SERVICE_CHAPTERS,
  getCelebSectionOrder,
} from "./celebSectionChapters";

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
  faction: boolean;
  videos: boolean;
  dialogues: boolean;
  dialogueVoice: boolean;
  influence: boolean;
  spectrum: boolean;
  sourceWorks: boolean;
  /** 실제로 등록된 기록물이 있는가. 없으면 서재 구획을 그리지 않는다. */
  library: boolean;
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

  return useMemo(() => {
    const items = [
      /* ── 1. 머리말·읽어보기·연표 ── */
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
        children: [
          {
            key: "person-guide",
            chapter: "02-A",
            label: t("personGuide"),
            icon: CELEB_SERVICE_ICONS.personGuide,
            ready: availability.reading,
            target: { sectionId: "reading" },
          },
          // 인물 탐구 닫음(2026-08-22). 안내만 제공한다.
          // 생성 품질이 기준에 못 미쳐 화면에서 내렸다. DB 필드는 남아 있다.
          // {
          //   key: "person-explore",
          //   chapter: "02-B",
          //   label: t("personExplore"),
          //   icon: CELEB_SERVICE_ICONS.personExplore,
          //   ready: availability.reading,
          //   target: { sectionId: "reading" },
          // },
        ],
      },
      {
        key: "timeline",
        chapter: CELEB_SERVICE_CHAPTERS.timeline,
        label: tier === "fiction" ? t("fictionTimeline") : t("timeline"),
        icon: CELEB_SERVICE_ICONS.timeline,
        ready: availability.timeline,
        target: { sectionId: "timeline" },
      },
      /* ── 2. 서재·원전 ── */
      {
        key: "library",
        chapter: CELEB_SERVICE_CHAPTERS.library,
        label: t("library"),
        icon: CELEB_SERVICE_ICONS.library,
        ready: showLibrary && availability.library,
        target: { sectionId: "library" },
      },
      {
        key: "sourceWorks",
        chapter: CELEB_SERVICE_CHAPTERS.library,
        label: t("sourceWorks"),
        icon: CELEB_SERVICE_ICONS.sourceWorks,
        ready: availability.sourceWorks,
        target: { sectionId: "source-works" },
      },
      /* ── 3. 분석·관계 ── */
      {
        key: "analysis",
        chapter: CELEB_SERVICE_CHAPTERS.analysis,
        label: tier === "fiction" ? t("fictionAnalysis") : t("analysis"),
        icon: CELEB_SERVICE_ICONS.analysis,
        // 가상 인물도 자료가 있을 때만 그린다. 예전에는 무조건 열려 빈 상자가 남았다
        ready: availability.spectrum || availability.influence,
        target: { sectionId: "analysis" },
        children: [
          {
            key: "spectrum",
            chapter: "06-A",
            label: t("profileAxes"),
            icon: CELEB_SERVICE_ICONS.spectrum,
            ready: availability.spectrum,
            target: { sectionId: "analysis" },
          },
          {
            key: "influence",
            chapter: "06-B",
            label: t("influence"),
            icon: CELEB_SERVICE_ICONS.influence,
            ready: availability.influence,
            target: { sectionId: "analysis" },
          },
        ],
      },
      {
        key: "connections",
        chapter: CELEB_SERVICE_CHAPTERS.connections,
        label: tier === "fiction" ? t("fictionConnections") : t("connections"),
        icon: CELEB_SERVICE_ICONS.connections,
        ready:
          availability.relations || availability.faction,
        target: { sectionId: "connections" },
        children: [
          {
            key: "relations",
            chapter: "05-A",
            label: t("relationGraph"),
            icon: CELEB_SERVICE_ICONS.relations,
            ready: availability.relations,
            target: { sectionId: "connections" },
          },
          {
            key: "faction",
            chapter: "05-C",
            label: tier === "fiction" ? t("fictionFaction") : t("serviceFaction"),
            icon: CELEB_SERVICE_ICONS.faction,
            ready: availability.faction,
            target: { sectionId: "connections" },
          },
        ],
      },
      /* ── 4. 미디어·방명록 ── */
      {
        key: "media",
        chapter: CELEB_SERVICE_CHAPTERS.media,
        label:
          tier === "fiction" && availability.dialogues && !availability.videos
            ? t("mediaDialogues")
            : t("media"),
        icon: CELEB_SERVICE_ICONS.media,
        ready:
          availability.videos
          || availability.dialogues,
        target: { sectionId: "media" },
        children: [
          // 가상 독백 탭은 서비스 노출에서 폐기했다. DB 원문은 제작 재료로만 보존한다.
          {
            key: "dialogues",
            chapter: "07-A",
            label: t("mediaDialogues"),
            icon: CELEB_SERVICE_ICONS.dialogues,
            ready: availability.dialogues,
            target: { sectionId: "media" },
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
      },
    ] satisfies ServiceItem[];
      /* ── 5. 순서 정렬·번호 재부여 ── */
      const sectionOrder = getCelebSectionOrder(tier);
    const positionByKey = new Map(
      sectionOrder.map((key, index) => [key, index]),
    );

    return items
      // 자료가 없는 구획은 목록에서 뺀다. 빈 안내만 남는 섹션을 화면에 만들지 않기 위해서다.
      .filter((item) => item.ready && positionByKey.has(item.key))
      .toSorted(
        (first, second) =>
          positionByKey.get(first.key)! - positionByKey.get(second.key)!,
      )
      // 걸러낸 뒤 번호를 다시 매긴다. 남은 순서대로 01, 02가 되어야 목차가 끊기지 않는다.
      .map((item, index) => {
        const chapter = String(index + 1).padStart(2, "0");
        return {
          ...item,
          chapter,
          children: item.children
            ?.filter((child) => child.ready)
            .map((child, childIndex) => ({
              ...child,
              chapter: `${chapter}-${String.fromCharCode(65 + childIndex)}`,
            })),
        };
      });
  },
    [
      availability.dialogueVoice,
      availability.dialogues,
      availability.faction,
      availability.influence,
      availability.spectrum,
      availability.relations,
      availability.reading,
      availability.library,
      availability.sourceWorks,
      availability.timeline,
      availability.videos,
      showLibrary,
      t,
      tier,
    ],
  );
}
