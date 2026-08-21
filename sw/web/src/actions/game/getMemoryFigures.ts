"use server";

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { LISTING_DEFAULT_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { getCelebYear } from "@/lib/celeb/lifespan";
import { createStaticClient } from "@/lib/supabase/static";
import type { MemoryFigure } from "@/components/features/game/memory/types";

interface ProfileBrief {
  id: string;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  profession: string | null;
}

interface MemoryFigureRow {
  celeb_id: string;
  total_score: number | null;
  celeb: ProfileBrief | ProfileBrief[] | null;
}

/** 감상 기록 보유 여부를 확인할 후보 수 — 여기서 걸러 아래 정원을 채운다 */
const CANDIDATE_LIMIT = 180;
/** 카드 풀 정원 — 고급 15쌍의 세 배 이상이면 조합이 충분히 갈린다 */
const FIGURE_LIMIT = 60;

async function fetchMemoryFigures(locale: string): Promise<MemoryFigure[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("celeb_influence")
    .select(`
      celeb_id,
      total_score,
      celeb:celebs!celeb_influence_celebs_fkey!inner (
        id,
        nickname,
        nickname_en,
        avatar_url,
        birth_date,
        profession
      )
    `)
    .eq("celeb.publication_status", "active")
    .in("celeb.celeb_tier", [...LISTING_DEFAULT_TIERS])
    .not("celeb.avatar_url", "is", null)
    .order("total_score", { ascending: false })
    .order("celeb_id", { ascending: true })
    .limit(CANDIDATE_LIMIT)
    .overrideTypes<MemoryFigureRow[], { merge: false }>();

  if (error) {
    throw new Error(`[getMemoryFigures] ${error.message}`);
  }

  const candidates = (data ?? []).flatMap((row) => {
    const profile = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb;
    if (!profile?.avatar_url || !profile.nickname) return [];

    return [{
      id: profile.id,
      name: locale === "en"
        ? (profile.nickname_en || profile.nickname)
        : profile.nickname,
      avatarUrl: profile.avatar_url,
      birthYear: getCelebYear(profile.birth_date) ?? 0,
      profession: profile.profession,
    }];
  });

  if (candidates.length === 0) return [];

  // 게임이 끝나면 만난 인물의 감상 기록을 펼쳐 보여준다 — 기록이 없는 인물은 카드에 올리지 않는다
  const { data: reviewed, error: reviewedError } = await supabase
    .from("celeb_contents")
    .select("celeb_id")
    .in("celeb_id", candidates.map((figure) => figure.id))
    .eq("visibility", "public")
    .not("review", "is", null)
    .neq("review", "");

  if (reviewedError) {
    throw new Error(`[getMemoryFigures] ${reviewedError.message}`);
  }

  const hasReview = new Set((reviewed ?? []).map((row) => row.celeb_id));
  return candidates.filter((figure) => hasReview.has(figure.id)).slice(0, FIGURE_LIMIT);
}

const getMemoryFiguresCached = unstable_cache(
  fetchMemoryFigures,
  ["memory-game-figures"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
);

export async function getMemoryFigures(): Promise<MemoryFigure[]> {
  return getMemoryFiguresCached(await getLocale());
}
