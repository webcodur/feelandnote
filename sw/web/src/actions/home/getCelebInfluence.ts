"use server";

import { createClient } from "@/lib/supabase/server";
import { type CelebLevel, getCelebLevelByRanking, calculatePercentile } from "@/constants/materials";

// 영향력 상세 데이터 타입
export interface CelebInfluenceDetail {
  celeb_id: string;
  nickname: string;
  avatar_url: string | null;
  profession: string | null;
  // 6대 영역 (각 0-10점)
  political: number;
  political_exp: string | null;
  strategic: number;
  strategic_exp: string | null;
  tech: number;
  tech_exp: string | null;
  social: number;
  social_exp: string | null;
  economic: number;
  economic_exp: string | null;
  cultural: number;
  cultural_exp: string | null;
  // 시대초월성 (0-40점)
  transhistoricity: number;
  transhistoricity_exp: string | null;
  // 총점 및 레벨
  total_score: number;
  level: CelebLevel;
  ranking: number;
  percentile: number;
}

// 영향력 상세 조회
export async function getCelebInfluence(celebId: string): Promise<CelebInfluenceDetail | null> {
  const supabase = await createClient();

  // 영향력 데이터 조회
  const { data, error } = await supabase
    .from("celeb_influence")
    .select(`
      celeb_id,
      political,
      political_exp,
      strategic,
      strategic_exp,
      tech,
      tech_exp,
      social,
      social_exp,
      economic,
      economic_exp,
      cultural,
      cultural_exp,
      transhistoricity,
      transhistoricity_exp,
      total_score,
      profiles!celeb_influence_celeb_id_fkey (
        nickname,
        avatar_url,
        profession
      )
    `)
    .eq("celeb_id", celebId)
    .single();

  if (error || !data) return null;

  // 순위 계산: 자신보다 점수 높은 셀럽 수 + 1
  const { count: higherCount } = await supabase
    .from("celeb_influence")
    .select("*", { count: "exact", head: true })
    .gt("total_score", data.total_score ?? 0);

  const { count: totalCount } = await supabase
    .from("celeb_influence")
    .select("*", { count: "exact", head: true })
    .gt("total_score", 0);

  const ranking = (higherCount ?? 0) + 1;
  const total = totalCount ?? 1;
  const percentile = calculatePercentile(ranking, total);
  const level = getCelebLevelByRanking(ranking, total);

  const profileData = data.profiles as unknown as { nickname: string; avatar_url: string | null; profession: string | null };

  return {
    celeb_id: data.celeb_id,
    nickname: profileData.nickname,
    avatar_url: profileData.avatar_url,
    profession: profileData.profession,
    political: data.political ?? 0,
    political_exp: data.political_exp,
    strategic: data.strategic ?? 0,
    strategic_exp: data.strategic_exp,
    tech: data.tech ?? 0,
    tech_exp: data.tech_exp,
    social: data.social ?? 0,
    social_exp: data.social_exp,
    economic: data.economic ?? 0,
    economic_exp: data.economic_exp,
    cultural: data.cultural ?? 0,
    cultural_exp: data.cultural_exp,
    transhistoricity: data.transhistoricity ?? 0,
    transhistoricity_exp: data.transhistoricity_exp,
    total_score: data.total_score ?? 0,
    level,
    ranking,
    percentile,
  };
}
