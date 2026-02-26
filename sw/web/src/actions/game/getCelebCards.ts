/*
  파일명: actions/game/getCelebCards.ts
  기능: 영향력 대전 카드 데이터 조회
  책임: Supabase에서 셀럽 카드 데이터를 일괄 조회한다.
*/
"use server";

import { createClient } from "@/lib/supabase/server";
import type { BattleCard, Domain } from "@/lib/game/types";
import type { DialogueLines } from "@/lib/game/voice/types";
import { isPublicDomainCeleb } from "@/components/features/game/utils";
import { validateSpeechTone } from "@/lib/game/voice/speechTone";

const DOMAIN_KEYS: Domain[] = ["political", "strategic", "tech", "social", "economic", "cultural"];

export async function getCelebCards(): Promise<BattleCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, nickname, profession, title, nationality, avatar_url, quotes, death_date, gender,
      celeb_influence!inner(
        political, strategic, tech, social, economic, cultural, transhistoricity
      ),
      celeb_persona!inner(command, martial, intellect, charisma, speech_tone),
      celeb_dialogues(lines)
    `)
    .eq("profile_type", "CELEB")
    .not("death_date", "is", null);

  if (error || !data) return [];

  return data
    .filter((row) => row.celeb_influence && row.celeb_persona && isPublicDomainCeleb(row.death_date))
    .map((row) => {
      const inf = Array.isArray(row.celeb_influence)
        ? row.celeb_influence[0]
        : row.celeb_influence;
      const per = Array.isArray(row.celeb_persona)
        ? row.celeb_persona[0]
        : row.celeb_persona;
      const dlg = Array.isArray(row.celeb_dialogues)
        ? row.celeb_dialogues[0]
        : row.celeb_dialogues;

      const influence = {} as Record<Domain, number>;
      for (const key of DOMAIN_KEYS) {
        influence[key] = inf[key] ?? 0;
      }

      const profession = row.profession ?? "other";
      const gender = row.gender ?? null;
      const speechTone = validateSpeechTone(per.speech_tone);

      // 개인별 대사: lines JSONB가 비어있지 않으면 사용
      const dialogueLines = dlg?.lines && Object.keys(dlg.lines).length > 0
        ? (dlg.lines as DialogueLines)
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
          charisma: per.charisma ?? 0,
        },
        dialogueLines,
      };
    });
}
