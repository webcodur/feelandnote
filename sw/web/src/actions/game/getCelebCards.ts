/*
  파일명: actions/game/getCelebCards.ts
  기능: 영향력 대전 카드 데이터 조회
  책임: Supabase에서 셀럽 카드 데이터를 일괄 조회한다.
*/
"use server";

import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { getLocale } from "next-intl/server";
import type { BattleCard, Domain } from "@/lib/game/types";
import type { DialogueLines } from "@/lib/game/voice/types";
import { isPublicDomainCeleb } from "@/components/features/game/utils";
import { validateSpeechTone } from "@/lib/game/voice/speechTone";
import { DIALOGUE_BRIEF_SELECT_WITH_ID, type DialogueBriefWithId } from "@/lib/utils/celeb-dialogues";
import type { Tables } from "@/types/supabase";

const DOMAIN_KEYS: Domain[] = ["political", "strategic", "tech", "social", "economic", "cultural"];

/** 게임 풀 최소 통시성 — 대중 인지도 확보 기준 */
const MIN_TRANSHISTORICITY = 15;

// celeb_influence 임베드 조회 행
type CelebInfluenceJoin = Pick<
  Tables<"celeb_influence">,
  "political" | "strategic" | "tech" | "social" | "economic" | "cultural" | "transhistoricity"
>;

// celeb_persona 임베드 조회 행
type CelebPersonaJoin = Pick<Tables<"celeb_persona">, "command" | "martial" | "intellect" | "charm">;

// 카드 풀 profiles 조회 행 (!inner 조인이라 임베드는 항상 존재)
type CelebCardRow = Pick<
  Tables<"profiles">,
  | "id" | "nickname" | "nickname_en" | "profession" | "title" | "title_en" | "nationality"
  | "avatar_url" | "death_date" | "gender" | "speech_tone" | "has_voice" | "voice_v" | "voice_speed"
> & {
  celeb_influence: CelebInfluenceJoin | CelebInfluenceJoin[];
  celeb_persona: CelebPersonaJoin | CelebPersonaJoin[];
};

/** 카드 풀 조회 (대사 미포함 — 경량, 1시간 캐시) */
async function fetchCelebCards(celebIdsKey: string, locale: string): Promise<BattleCard[]> {
  const celebIds = celebIdsKey ? celebIdsKey.split(",") : undefined;
  const supabase = createStaticClient();
  const isEn = locale === "en";

  let query = supabase
    .from("profiles")
    .select(`
      id, nickname, nickname_en, profession, title, title_en, nationality, avatar_url, death_date, gender, speech_tone, has_voice, voice_v, voice_speed,
      celeb_influence!inner(
        political, strategic, tech, social, economic, cultural, transhistoricity
      ),
      celeb_persona!inner(command, martial, intellect, charm)
    `)
    .eq("profile_type", "CELEB")
    .eq("status", "active")
    .not("death_date", "is", null)
    .gte("celeb_influence.transhistoricity", MIN_TRANSHISTORICITY);

  if (celebIds && celebIds.length > 0) {
    query = query.in("id", celebIds);
  }

  const { data: personaData, error: personaError } = await query;

  if (personaError || !personaData) {
    console.error("[getCelebCards] 셀럽 카드 조회 실패:", personaError?.message);
    return [];
  }

  const cardRows: CelebCardRow[] = personaData;

  // quote만 JSON path로 조회 (전체 lines JSONB 송출 방지)
  const cardIds = cardRows.map(r => r.id);
  const quoteMap = new Map<string, string>();
  if (cardIds.length > 0) {
    const { data: dRows } = await supabase
      .from("celeb_dialogues")
      .select(DIALOGUE_BRIEF_SELECT_WITH_ID)
      .in("celeb_id", cardIds);
    for (const d of (dRows ?? []) as unknown as DialogueBriefWithId[]) {
      const quote = (isEn && d.quote_en) ? d.quote_en : d.quote;
      quoteMap.set(d.celeb_id, quote ?? "");
    }
  }

  return cardRows
    .filter((row) => row.celeb_influence && row.celeb_persona && isPublicDomainCeleb(row.death_date))
    .map((row) => {
      const inf = Array.isArray(row.celeb_influence)
        ? row.celeb_influence[0]
        : row.celeb_influence;
      const per = Array.isArray(row.celeb_persona)
        ? row.celeb_persona[0]
        : row.celeb_persona;

      const influence = {} as Record<Domain, number>;
      for (const key of DOMAIN_KEYS) {
        influence[key] = inf[key] ?? 0;
      }

      return {
        id: row.id,
        nickname: (isEn && row.nickname_en) || (row.nickname ?? ""),
        profession: row.profession ?? "other",
        title: (isEn && row.title_en) || (row.title ?? ""),
        nationality: row.nationality ?? "",
        avatarUrl: row.avatar_url,
        portraitUrl: null,
        quotes: quoteMap.get(row.id) ?? "",
        gender: row.gender ?? null,
        speechTone: validateSpeechTone(row.speech_tone),
        influence,
        ability: {
          command: per.command ?? 0,
          martial: per.martial ?? 0,
          intellect: per.intellect ?? 0,
          charm: per.charm ?? 0,
        },
        hasVoice: row.has_voice ?? false,
        voiceV: row.voice_v ?? 0,
        voiceSpeed: row.voice_speed ?? 1.0,
      };
    });
}

const getCelebCardsCached = unstable_cache(
  fetchCelebCards,
  ["celeb-cards"],
  { revalidate: 3600, tags: ["celebs"] }
);

export async function getCelebCards(celebIds?: string[]): Promise<BattleCard[]> {
  const locale = await getLocale();
  const key = celebIds && celebIds.length > 0 ? [...celebIds].sort().join(",") : "";
  return getCelebCardsCached(key, locale);
}

/** 드래프트 풀 확정 후, 선택된 카드의 대사만 조회 (1시간 캐시) — Map은 직렬화 불가라 Record로 캐시 후 변환 */
async function fetchCardDialogues(
  cardIdsKey: string,
  locale: string,
): Promise<Record<string, DialogueLines>> {
  const cardIds = cardIdsKey ? cardIdsKey.split(",") : [];
  if (cardIds.length === 0) return {};

  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from("celeb_dialogues")
    .select("celeb_id, lines, lines_en")
    .in("celeb_id", cardIds);

  if (error) {
    console.error("[loadCardDialogues] 대사 조회 실패:", error.message);
    return {};
  }

  const out: Record<string, DialogueLines> = {};
  for (const d of data ?? []) {
    const lines = (locale === 'en' && d.lines_en) ? d.lines_en : d.lines;
    if (lines) out[d.celeb_id] = lines as DialogueLines;
  }
  return out;
}

const getCardDialoguesCached = unstable_cache(
  fetchCardDialogues,
  ["card-dialogues"],
  { revalidate: 3600, tags: ["celebs"] }
);

export async function loadCardDialogues(cardIds: string[]): Promise<Map<string, DialogueLines>> {
  if (cardIds.length === 0) return new Map();
  const locale = await getLocale();
  const key = [...cardIds].sort().join(",");
  const record = await getCardDialoguesCached(key, locale);
  return new Map(Object.entries(record));
}
