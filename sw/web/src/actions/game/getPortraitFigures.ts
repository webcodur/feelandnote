"use server";

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { LISTING_DEFAULT_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import type { PortraitFigure } from "@/components/features/game/portrait/types";

interface ProfileBrief {
  id: string;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
}

interface PortraitFigureRow {
  celeb_id: string;
  total_score: number | null;
  celeb: ProfileBrief | ProfileBrief[] | null;
}

async function fetchPortraitFigures(locale: string): Promise<PortraitFigure[]> {
  const db = createStaticClient();
  const { data, error } = await db
    .from("celeb_influence")
    .select(`
      celeb_id,
      total_score,
      celeb:celebs!celeb_influence_celebs_fkey!inner (
        id,
        nickname,
        nickname_en,
        avatar_url
      )
    `)
    .eq("celeb.publication_status", "active")
    .in("celeb.celeb_tier", [...LISTING_DEFAULT_TIERS])
    .not("celeb.avatar_url", "is", null)
    .order("total_score", { ascending: false })
    .order("celeb_id", { ascending: true })
    .limit(60)
    .overrideTypes<PortraitFigureRow[], { merge: false }>();

  if (error) {
    throw new Error(`[getPortraitFigures] ${error.message}`);
  }

  return (data ?? []).flatMap((row) => {
    const profile = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb;
    if (!profile?.avatar_url || !profile.nickname) return [];

    return [{
      id: profile.id,
      name: locale === "en"
        ? (profile.nickname_en || profile.nickname)
        : profile.nickname,
      avatarUrl: profile.avatar_url,
    }];
  });
}

const getPortraitFiguresCached = unstable_cache(
  fetchPortraitFigures,
  ["portrait-game-figures"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
);

export async function getPortraitFigures(): Promise<PortraitFigure[]> {
  return getPortraitFiguresCached(await getLocale());
}
