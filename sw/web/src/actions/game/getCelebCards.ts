/*
  파일명: actions/game/getCelebCards.ts
  기능: 영향력 대전 카드 데이터 조회
  책임: Supabase에서 셀럽 카드 데이터를 일괄 조회한다.
*/
"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import type { BattleCard, Domain } from "@/lib/game/types";
import type { DialogueLines } from "@/lib/game/voice/types";
import { isPublicDomainCeleb } from "@/components/features/game/utils";
import { validateSpeechTone } from "@/lib/game/voice/speechTone";

const DOMAIN_KEYS: Domain[] = ["political", "strategic", "tech", "social", "economic", "cultural"];

/** 게임 풀 최소 통시성 — 대중 인지도 확보 기준 */
const MIN_TRANSHISTORICITY = 15;

/** 카드 풀 조회 (대사 미포함 — 경량) */
export async function getCelebCards(celebIds?: string[]): Promise<BattleCard[]> {
  const supabase = await createClient();
  const locale = await getLocale();
  const isEn = locale === "en";

  let query = supabase
    .from("profiles")
    .select(`
      id, nickname, nickname_en, profession, title, title_en, nationality, avatar_url, quotes, quotes_en, death_date, gender, speech_tone, has_voice, voice_v,
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

  return personaData
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
        nickname: (isEn && (row as any).nickname_en) || (row.nickname ?? ""),
        profession: row.profession ?? "other",
        title: (isEn && (row as any).title_en) || (row.title ?? ""),
        nationality: row.nationality ?? "",
        avatarUrl: row.avatar_url,
        portraitUrl: null,
        quotes: (isEn && (row as any).quotes_en) || (row.quotes ?? ""),
        gender: row.gender ?? null,
        speechTone: validateSpeechTone(row.speech_tone),
        influence,
        ability: {
          command: per.command ?? 0,
          martial: per.martial ?? 0,
          intellect: per.intellect ?? 0,
          charm: per.charm ?? 0,
        },
        hasVoice: (row as any).has_voice ?? false,
        voiceV: (row as any).voice_v ?? 0,
      };
    });
}

/** 드래프트 풀 확정 후, 선택된 카드의 대사만 조회하여 병합 */
export async function loadCardDialogues(cardIds: string[]): Promise<Map<string, DialogueLines>> {
  if (cardIds.length === 0) return new Map();

  const supabase = await createClient();
  const locale = await getLocale();

  const { data, error } = await supabase
    .from("celeb_dialogues")
    .select("celeb_id, lines, lines_en")
    .in("celeb_id", cardIds);

  if (error) {
    console.error("[loadCardDialogues] 대사 조회 실패:", error.message);
    return new Map();
  }

  const map = new Map<string, DialogueLines>();
  for (const d of data ?? []) {
    const lines = (locale === 'en' && d.lines_en) ? d.lines_en : d.lines;
    if (lines) map.set(d.celeb_id, lines as DialogueLines);
  }
  return map;
}
