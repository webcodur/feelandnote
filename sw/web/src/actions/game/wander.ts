"use server";

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { LISTING_DEFAULT_REALITIES } from "@feelandnote/shared/constants/celeb-tiers";
import { selectAllPages, selectInChunks } from "@feelandnote/shared/lib/paginate";
import { createStaticClient } from "@/lib/db/static";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { getCelebLifeEndYear, getCelebYear } from "@/lib/celeb/lifespan";
import { getRegionForNationality } from "@/lib/game/suikoden/utils";
import { WANDER_ERAS, WANDER_POOL_SIZE } from "@/lib/game/wander/constants";
import type { WanderFigure, WanderPools } from "@/lib/game/wander/types";
import { DIALOGUE_BRIEF_SELECT_WITH_ID, type DialogueBriefWithId } from "@/lib/utils/celeb-dialogues";
import type { Tables } from "@/types/database.generated";

type ProfileRow = Pick<Tables<"celebs">, "id" | "nickname" | "nickname_en" | "title" | "title_en" | "nationality" | "avatar_url" | "birth_date" | "death_date">;
type InfluenceRow = Pick<Tables<"celeb_influence">, "celeb_id" | "total_score">;
type SpectrumRow = Pick<Tables<"celeb_persona">, "celeb_id" | "command" | "martial" | "intellect" | "charm">;
type FigureBase = Omit<WanderFigure, "name" | "title" | "quote"> & ProfileRow;

function takeDiverse(figures: FigureBase[]): FigureBase[] {
  const groups = new Map<string, FigureBase[]>();
  for (const figure of figures) {
    const list = groups.get(figure.region) ?? [];
    list.push(figure);
    groups.set(figure.region, list);
  }
  const result: FigureBase[] = [];
  while (result.length < WANDER_POOL_SIZE) {
    let added = false;
    for (const list of groups.values()) {
      const next = list.shift();
      if (next) {
        result.push(next);
        added = true;
      }
      if (result.length >= WANDER_POOL_SIZE) break;
    }
    if (!added) break;
  }
  return result;
}

async function fetchWanderPools(locale: string): Promise<WanderPools> {
  const db = createStaticClient();
  const [celebRows, influences, spectra] = await Promise.all([
    selectAllPages<ProfileRow>((from, to) => db.from("celebs")
      .select("id, nickname, nickname_en, title, title_en, nationality, avatar_url, birth_date, death_date")
      .eq("publication_status", "active")
      .in("celeb_reality", [...LISTING_DEFAULT_REALITIES]).not("birth_date", "is", null)
      .order("id").range(from, to).overrideTypes<ProfileRow[], { merge: false }>()),
    selectAllPages<InfluenceRow>((from, to) => db.from("celeb_influence")
      .select("celeb_id, total_score").order("celeb_id").range(from, to)),
    selectAllPages<SpectrumRow>((from, to) => db.from("celeb_persona")
      .select("celeb_id, command, martial, intellect, charm").order("celeb_id").range(from, to)),
  ]);
  const influenceMap = new Map(influences.map((row) => [row.celeb_id, row.total_score ?? 0]));
  const spectrumMap = new Map(spectra.map((row) => [row.celeb_id, row]));
  const currentYear = new Date().getFullYear();
  const bases = celebRows.flatMap((profile): FigureBase[] => {
    const spectrum = spectrumMap.get(profile.id);
    if (!spectrum || !profile.nickname) return [];
    return [{
      ...profile,
      nationality: profile.nationality ?? "",
      avatarUrl: profile.avatar_url,
      birthYear: getCelebYear(profile.birth_date) ?? 0,
      deathYear: getCelebLifeEndYear(profile.birth_date, profile.death_date) ?? currentYear,
      region: getRegionForNationality(profile.nationality ?? ""),
      totalScore: influenceMap.get(profile.id) ?? 0,
      powers: {
        might: Math.round(spectrum.command * 0.55 + spectrum.martial * 0.45),
        insight: spectrum.intellect,
        support: spectrum.charm,
      },
    }];
  });
  const selected = WANDER_ERAS.map((era) => takeDiverse(bases
    .filter((figure) => figure.birthYear <= era.end && figure.deathYear >= era.start)
    .sort((a, b) => b.totalScore - a.totalScore)));
  const ids = [...new Set(selected.flat().map((figure) => figure.id))];
  const dialogues = await selectInChunks<DialogueBriefWithId>(ids, (chunk) => db
    .from("celeb_dialogues").select(DIALOGUE_BRIEF_SELECT_WITH_ID).in("celeb_id", chunk)
    .overrideTypes<DialogueBriefWithId[], { merge: false }>());
  const dialogueMap = new Map(dialogues.map((row) => [row.celeb_id, row]));
  const isEn = locale === "en";
  return Object.fromEntries(WANDER_ERAS.map((era, index) => [era.key, selected[index].map((figure) => {
    const dialogue = dialogueMap.get(figure.id);
    return {
      id: figure.id, name: (isEn && figure.nickname_en) || figure.nickname || "?",
      title: (isEn && figure.title_en) || figure.title || "", nationality: figure.nationality,
      avatarUrl: figure.avatarUrl, birthYear: figure.birthYear, deathYear: figure.deathYear,
      region: figure.region, totalScore: figure.totalScore, powers: figure.powers,
      quote: (isEn && dialogue?.quote_en) || dialogue?.quote || "",
    };
  })])) as WanderPools;
}

const getWanderPoolsCached = unstable_cache(fetchWanderPools, ["wander-figure-pools"], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES],
});

export async function loadWanderPools(): Promise<WanderPools> {
  const locale = await getLocale();
  return getWanderPoolsCached(locale);
}
