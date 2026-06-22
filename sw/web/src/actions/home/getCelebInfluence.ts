"use server";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { type CelebLevel, getCelebLevelByRanking, calculatePercentile } from "@/constants/materials";

// 영향력 상세 데이터 타입
export interface CelebInfluenceDetail {
  celeb_id: string;
  nickname: string;
  avatar_url: string | null;
  profession: string | null;
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
  transhistoricity: number;
  transhistoricity_exp: string | null;
  total_score: number;
  level: CelebLevel;
  ranking: number;
  percentile: number;
}

async function fetchCelebInfluence(celebId: string): Promise<CelebInfluenceDetail | null> {
  const supabase = createStaticClient();

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

  // 두 count 쿼리 병렬화 (Promise.all)
  const totalScore = data.total_score ?? 0;
  const [{ count: higherCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from("celeb_influence")
      .select("*", { count: "exact", head: true })
      .gt("total_score", totalScore),
    supabase
      .from("celeb_influence")
      .select("*", { count: "exact", head: true })
      .gt("total_score", 0),
  ]);

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
    total_score: totalScore,
    level,
    ranking,
    percentile,
  };
}

const getCelebInfluenceCached = unstable_cache(
  fetchCelebInfluence,
  ["celeb-influence-detail"],
  { revalidate: STATIC_REVALIDATE, tags: ["celebs"] }
);

// React.cache로 같은 RSC 요청 안의 중복 호출 dedup + unstable_cache로 cross-request 캐시
export const getCelebInfluence = cache(async (celebId: string): Promise<CelebInfluenceDetail | null> => {
  return getCelebInfluenceCached(celebId);
});
