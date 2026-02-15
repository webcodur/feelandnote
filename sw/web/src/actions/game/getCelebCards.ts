/*
  파일명: actions/game/getCelebCards.ts
  기능: 영향력 대전 카드 데이터 조회
  책임: Supabase에서 셀럽 카드 데이터를 일괄 조회한다.
*/
"use server";

import { createClient } from "@/lib/supabase/server";
import type { BattleCard, Domain } from "@/lib/game/types";
import { toTier } from "@/lib/game/deckBuilder";
import { isPublicDomainCeleb } from "@/components/features/game/utils";

const DOMAIN_KEYS: Domain[] = ["political", "strategic", "tech", "social", "economic", "cultural"];

export async function getCelebCards(): Promise<BattleCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, nickname, profession, title, nationality, avatar_url, quotes, death_date,
      celeb_influence!inner(
        political, strategic, tech, social, economic, cultural, transhistoricity
      ),
      celeb_persona!inner(command, martial, intellect, charisma)
    `)
    .eq("profile_type", "CELEB")
    .not("death_date", "is", null);

  if (error || !data) return [];

  return data
    .filter((row: any) => row.celeb_influence && row.celeb_persona && isPublicDomainCeleb(row.death_date))
    .map((row: any) => {
      const inf = Array.isArray(row.celeb_influence)
        ? row.celeb_influence[0]
        : row.celeb_influence;
      const per = Array.isArray(row.celeb_persona)
        ? row.celeb_persona[0]
        : row.celeb_persona;

      const influence: Record<Domain, number> = {} as any;
      let domainSum = 0;
      for (const key of DOMAIN_KEYS) {
        const val = inf[key] ?? 0;
        influence[key] = val;
        domainSum += val;
      }
      const totalScore = domainSum + (inf.transhistoricity ?? 0);

      return {
        id: row.id,
        nickname: row.nickname ?? "",
        profession: row.profession ?? "other",
        title: row.title ?? "",
        nationality: row.nationality ?? "",
        avatarUrl: row.avatar_url,
        quotes: row.quotes ?? "",
        tier: toTier(totalScore),
        influence,
        ability: {
          command: per.command ?? 0,
          martial: per.martial ?? 0,
          intellect: per.intellect ?? 0,
          charisma: per.charisma ?? 0,
        },
      };
    });
}
