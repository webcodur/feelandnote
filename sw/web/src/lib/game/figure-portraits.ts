import type { DatabaseClient } from "@feelandnote/db";
import { LISTING_DEFAULT_REALITIES } from "@feelandnote/shared/constants/celeb-tiers";
import { selectAllPages, selectInChunks } from "@feelandnote/shared/lib/paginate";
import { getCelebYear } from "@/lib/celeb/lifespan";
import { GAME_FIGURE_RULES, selectGameFigures } from "./figure-selection";

interface Profile {
  id: string;
  nickname: string | null;
  nickname_en: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  death_date: string | null;
  profession: string | null;
}
interface PortraitRow {
  celeb_id: string;
  celeb: Profile | Profile[] | null;
}

/** 기억·시대의 초상 공통 조회. 페이지 상한과 긴 UUID 요청을 각각 나눠 처리한다. */
export async function readGamePortraitFigures(db: DatabaseClient, locale: string, requireReview: boolean) {
  const rows = await selectAllPages<PortraitRow>((from, to) => db
    .from("celeb_influence")
    .select(`celeb_id,celeb:celebs!celeb_influence_celebs_fkey!inner(
      id,nickname,nickname_en,avatar_url,birth_date,death_date,profession)`)
    .eq("celeb.publication_status", "active")
    .in("celeb.celeb_reality", [...LISTING_DEFAULT_REALITIES])
    .not("celeb.avatar_url", "is", null).not("celeb.death_date", "is", null)
    .order("total_score", { ascending: false }).order("celeb_id", { ascending: true })
    .range(from, to).overrideTypes<PortraitRow[], { merge: false }>(), GAME_FIGURE_RULES.candidateScanLimit);
  const profileOf = (row: PortraitRow) => Array.isArray(row.celeb) ? row.celeb[0] : row.celeb;
  const candidates = selectGameFigures(rows, profileOf).flatMap((row) => {
    const p = profileOf(row)!;
    if (!p.avatar_url || !p.nickname) return [];
    return [{ id: p.id, name: locale === "en" ? p.nickname_en || p.nickname : p.nickname,
      avatarUrl: p.avatar_url, birthYear: getCelebYear(p.birth_date) ?? 0, profession: p.profession }];
  });
  if (!requireReview) return candidates.slice(0, GAME_FIGURE_RULES.portraitPoolSize);
  const reviews = await selectInChunks<{ celeb_id: string }>(candidates.map((p) => p.id), (ids) =>
    selectAllPages<{ celeb_id: string }>((from, to) => db.from("celeb_contents")
      .select("celeb_id").in("celeb_id", ids).eq("visibility", "public")
      .not("review", "is", null).neq("review", "").order("id").range(from, to))
      .then((data) => ({ data, error: null })));
  const reviewed = new Set(reviews.map((row) => row.celeb_id));
  return candidates.filter((p) => reviewed.has(p.id)).slice(0, GAME_FIGURE_RULES.memoryPoolSize);
}
