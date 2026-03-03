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

export async function getCelebCards(celebIds?: string[]): Promise<BattleCard[]> {
  const supabase = await createClient();
  const locale = await getLocale();

  // 1. celeb_persona 조회 (stat_power 등 스탯 + basicSpeechTone)
  let query = supabase
    .from("profiles")
    .select(`
      id, nickname, profession, title, nationality, avatar_url, quotes, death_date, gender, speech_tone,
      celeb_influence!inner(
        political, strategic, tech, social, economic, cultural, transhistoricity
      ),
      celeb_persona!inner(command, martial, intellect, charm)
    `)
    .eq("profile_type", "CELEB")
    .eq("status", "active")
    .not("death_date", "is", null);

  if (celebIds && celebIds.length > 0) {
    query = query.in("id", celebIds);
  }

  const { data: personaData, error: personaError } = await query;

  if (personaError || !personaData) {
    console.error("[getCelebCards] 셀럽 페르소나 조회 실패:", personaError?.message);
    return [];
  }

  // 2. celeb_dialogues 조회 (대사)
  const personaIds = personaData.map((r) => r.id);
  let dialogueQuery = supabase
    .from("celeb_dialogues")
    .select("celeb_id, lines, lines_en");

  if (celebIds && celebIds.length > 0) {
    dialogueQuery = dialogueQuery.in("celeb_id", celebIds);
  } else {
    dialogueQuery = dialogueQuery.in("celeb_id", personaIds);
  }

  const { data: dialogueData, error: dialogueError } = await dialogueQuery;

  if (dialogueError) {
    console.error("[getCelebCards] 셀럽 대사 조회 실패:", dialogueError?.message);
    // 대사 데이터가 없어도 카드 조회는 계속 진행
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

      const profession = row.profession ?? "other";
      const gender = row.gender ?? null;
      const speechTone = validateSpeechTone(row.speech_tone);

      // 대사 라인 맵핑 (locale 고려)
      const dialogueRecord = dialogueData?.find((d) => d.celeb_id === row.id);
      const dialogueLines = dialogueRecord
        ? ((locale === 'en' && dialogueRecord.lines_en) ? dialogueRecord.lines_en : dialogueRecord.lines) as DialogueLines
        : undefined;

      return {
        id: row.id,
        nickname: row.nickname ?? "",
        profession,
        title: row.title ?? "",
        nationality: row.nationality ?? "",
        avatarUrl: row.avatar_url,
        portraitUrl: null,
        quotes: row.quotes ?? "",
        gender,
        speechTone,
        influence,
        ability: {
          command: per.command ?? 0,
          martial: per.martial ?? 0,
          intellect: per.intellect ?? 0,
          charm: per.charm ?? 0,
        },
        dialogueLines,
      };
    });
}
