/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 모델(서비스 아이템 조립)
 * - 목차 위치: 공통 (전 구획: introduction/reading/timeline/library/sourceWorks/analysis/connections/media/guestbook)
 * - 데이터: profile/timelineEvents/sideAvailability/dialogueLines/fictionSources/initialContents props
 * - 함께 보기: celebServiceItems.ts, detail/celebDetailData.ts
 * ───────────────────────────────────────────── */
"use client";

import { useMemo } from "react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

import { useTranslations } from "next-intl";

import {
  type CelebServiceAvailability,
  type ServiceItem,
  useCelebServiceItems,
} from "../celebServiceItems";
import { CELEB_SERVICE_ICONS } from "../celebServiceIcons";
import { getLocalizedCelebVideos } from "./celebDetailData";

/**
 * 관계·분석 구획은 화면이 다가왔을 때 브라우저가 직접 불러온다.
 * 목차는 그보다 먼저 그려져야 하므로 「있다·없다」만 서버에서 넘겨받는다.
 */
export interface CelebSideAvailability {
  relations: boolean;
  faction: boolean;
  influence: boolean;
  spectrum: boolean;
  /** 이어지는 인물 구획이 그려지는가(관계가 있어야 채운다) */
  relatedFigures: boolean;
  /** 관련 상품 구획이 그려지는가(full+한국어+상품 있음) */
  affiliateBooks: boolean;
}

interface UseCelebServiceModelProps {
  profile: CelebBySlugProfile;
  locale: Locale;
  timelineEvents: CelebTimelineEvent[];
  sideAvailability: CelebSideAvailability;
  dialogueLines?: Record<string, string[]> | null;
  fictionSources: FictionSourceContent[];
  initialContents: GetUserContentsResponse;
}

export interface CelebServiceModel {
  items: ServiceItem[];
  longform: ReturnType<typeof getLocalizedCelebVideos>["longform"];
  shorts: ReturnType<typeof getLocalizedCelebVideos>["shorts"];
  hasVoice: boolean;
  /** 전 구획 제목 중 가장 긴 것. 3열 너비를 한 값으로 고정한다 */
  widestSectionLabel: string;
}

/**
 * 인물 화면의 목차를 만든다.
 * 머리말의 이동 화살표와 옆 목차, 본문 구획이 모두 이 결과 하나를 보게 해서
 * 자료가 없어 사라진 구획으로 안내하는 일이 없도록 한다.
 */
export function useCelebServiceModel({
  profile,
  locale,
  timelineEvents,
  sideAvailability,
  dialogueLines,
  fictionSources,
  initialContents,
}: UseCelebServiceModelProps): CelebServiceModel {
  const celebTier = profile.celeb_tier ?? "full";
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
    relations: sideAvailability.relations,
    timeline: timelineEvents.length > 0,
    faction: sideAvailability.faction,
    videos: longform.length > 0 || shorts.length > 0,
    dialogues: hasDialogues,
    dialogueVoice: hasDialogues && hasVoice,
    influence: sideAvailability.influence,
    spectrum: sideAvailability.spectrum,
    sourceWorks: fictionSources.length > 0,
    library: initialContents.items.length > 0,
  };

  const baseItems = useCelebServiceItems({
    tier: celebTier,
    showLibrary: celebTier === "full",
    availability,
  });

  // 페이지末 후행 구획(이어지는 인물·관련 상품)은 본문 목차 밖에 있어
  // 따로 붙인다. 장 번호는 매기지 않는다(히어로는 앞 두 항목만 쓴다).
  const t = useTranslations("celebPage");
  const items = useMemo(() => {
    const trailing: ServiceItem[] = [];
    if (sideAvailability.relatedFigures) {
      trailing.push({
        key: "relatedFigures",
        chapter: "",
        label: t("relatedLinksTitle"),
        icon: CELEB_SERVICE_ICONS.relatedFigures,
        ready: true,
        target: { sectionId: "related-figures" },
      });
    }
    if (sideAvailability.affiliateBooks) {
      trailing.push({
        key: "affiliateBooks",
        chapter: "",
        label: t("relatedProducts"),
        icon: CELEB_SERVICE_ICONS.affiliateBooks,
        ready: true,
        target: { sectionId: "affiliate-books" },
      });
    }
    return trailing.length > 0 ? [...baseItems, ...trailing] : baseItems;
  }, [baseItems, sideAvailability.relatedFigures, sideAvailability.affiliateBooks, t]);

  const widestSectionLabel = useMemo(
    () =>
      items.reduce(
        (widest, item) =>
          item.label.length > widest.length ? item.label : widest,
        "",
      ),
    [items],
  );

  return { items, longform, shorts, hasVoice, widestSectionLabel };
}
