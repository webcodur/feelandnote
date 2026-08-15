"use client";

import { useMemo } from "react";

import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { FeaturedTag } from "@/actions/home/getFeaturedTags";
import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

import {
  type CelebServiceAvailability,
  type ServiceItem,
  useCelebServiceItems,
} from "../celebServiceItems";
import { getLocalizedCelebVideos } from "./celebDetailData";

interface UseCelebServiceModelProps {
  profile: CelebBySlugProfile;
  locale: Locale;
  contemporaries: ContemporaryCeleb[];
  timelineEvents: CelebTimelineEvent[];
  factionTags: FeaturedTag[];
  influenceData: CelebInfluenceDetail | null;
  spectrumData: SimilarByCelebResult | null;
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
  contemporaries,
  timelineEvents,
  factionTags,
  influenceData,
  spectrumData,
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
    relations: profile.relations.length > 0,
    timeline: timelineEvents.length > 0,
    contemporaries: contemporaries.length > 0,
    faction: factionTags.length > 0,
    videos: longform.length > 0 || shorts.length > 0,
    dialogues: hasDialogues,
    dialogueVoice: hasDialogues && hasVoice,
    influence: Boolean(influenceData),
    spectrum: Boolean(spectrumData?.targetSpectrum),
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
