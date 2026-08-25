"use client";

import { useMemo } from "react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

import {
  type CelebServiceAvailability,
  type ServiceItem,
  useCelebServiceItems,
} from "../celebServiceItems";
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

  const items = useCelebServiceItems({
    tier: celebTier,
    showLibrary: celebTier === "full",
    availability,
  });

  return { items, longform, shorts, hasVoice };
}
