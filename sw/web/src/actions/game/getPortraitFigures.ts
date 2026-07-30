"use server";

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { LISTING_DEFAULT_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/supabase/static";
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
  profiles: ProfileBrief | ProfileBrief[] | null;
}

async function fetchPortraitFigures(locale: string): Promise<PortraitFigure[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("celeb_influence")
    .select(`
      celeb_id,
      total_score,
      profiles!celeb_influence_celeb_id_fkey!inner (
        id,
        nickname,
        nickname_en,
        avatar_url
      )
    `)
    .eq("profiles.status", "active")
    .in("profiles.celeb_tier", [...LISTING_DEFAULT_TIERS])
    .not("profiles.avatar_url", "is", null)
    .order("total_score", { ascending: false })
    .order("celeb_id", { ascending: true })
    .limit(60)
    .overrideTypes<PortraitFigureRow[], { merge: false }>();

  if (error) {
    throw new Error(`[getPortraitFigures] ${error.message}`);
  }

  return (data ?? []).flatMap((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
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
