/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 아이템 정의·정렬
 * - 목차 위치: 공통 (전 구획)
 * - 데이터: reality/availability props, next-intl celebPage
 * - 함께 보기: celebSectionChapters.ts, celebServiceIcons.ts, detail/useCelebServiceModel.ts
 * ───────────────────────────────────────────── */
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import type { CelebReality } from "@/actions/user/getUserProfile";

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
}

export interface CelebServiceAvailability {
  personGuide: boolean;
  virtualMonologue: boolean;
  relations: boolean;
  influence: boolean;
  spectrum: boolean;
  /** 실제로 등록된 감상 기록이 있는가. 없으면 리뷰 구획을 그리지 않는다. */
  library: boolean;
}

interface UseCelebServiceItemsProps {
  reality: CelebReality;
  showLibrary: boolean;
  availability: CelebServiceAvailability;
}

export function useCelebServiceItems({
  reality,
  showLibrary,
  availability,
}: UseCelebServiceItemsProps): ServiceItem[] {
  const t = useTranslations("celebPage");

  return useMemo(() => {
    const items = [
      /* ── 1. 머리말·인물 안내·가상독백 ── */
      {
        key: "introduction",
        chapter: CELEB_SERVICE_CHAPTERS.introduction,
        label: t("serviceIntroduction"),
        icon: CELEB_SERVICE_ICONS.introduction,
        ready: true,
        target: { sectionId: "introduction" },
      },
      {
        key: "personGuide",
        chapter: CELEB_SERVICE_CHAPTERS.personGuide,
        label: t("personGuide"),
        icon: CELEB_SERVICE_ICONS.personGuide,
        ready: availability.personGuide,
        target: { sectionId: "person-guide" },
      },
      {
        key: "virtualMonologue",
        chapter: CELEB_SERVICE_CHAPTERS.virtualMonologue,
        label: t("virtualMonologue"),
        icon: CELEB_SERVICE_ICONS.virtualMonologue,
        ready: availability.virtualMonologue,
        target: { sectionId: "virtual-monologue" },
      },
      /* ── 2. 리뷰 ── */
      {
        key: "library",
        chapter: CELEB_SERVICE_CHAPTERS.library,
        // 「기록」이 아니라 「리뷰」로 부른다 — 안에는 감상 기록만 남았다.
        label: t("tabConsume"),
        icon: CELEB_SERVICE_ICONS.library,
        ready: showLibrary && availability.library,
        target: { sectionId: "library" },
      },
      /* ── 3. 분석·관계 ── */
      {
        key: "analysis",
        chapter: CELEB_SERVICE_CHAPTERS.analysis,
        label: reality !== "REAL" ? t("fictionAnalysis") : t("analysis"),
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
        label: reality !== "REAL" ? t("fictionConnections") : t("connections"),
        icon: CELEB_SERVICE_ICONS.connections,
        ready: availability.relations,
        target: { sectionId: "connections" },
      },
      /* ── 4. 방명록 ── */
      {
        key: "guestbook",
        chapter: CELEB_SERVICE_CHAPTERS.guestbook,
        label: reality !== "REAL" ? t("fictionGuestbook") : t("guestbook"),
        icon: CELEB_SERVICE_ICONS.guestbook,
        ready: true,
        target: { sectionId: "guestbook" },
      },
    ] satisfies ServiceItem[];
      /* ── 5. 순서 정렬·번호 재부여 ── */
      const sectionOrder = getCelebSectionOrder(reality);
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
      availability.influence,
      availability.spectrum,
      availability.relations,
      availability.personGuide,
      availability.virtualMonologue,
      availability.library,
      showLibrary,
      t,
      reality,
    ],
  );
}
