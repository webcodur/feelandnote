"use server";

import { cache } from "react";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { createStaticClient } from "@/lib/supabase/static";
import { NO_ROWS_CODE, throwOnQueryError, cachedDetail } from '@/lib/cache';
import { type CelebLevel, getCelebLevelByRanking, calculatePercentile } from "@/constants/materials";
import { resolveLocale, type Locale } from "@/types/locale";

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
  /** 점수를 가진 전체 인물 수 (순위의 모수) */
  rankedTotal: number;
  /** 영문 화면에서 영문 해설이 없어 한국어 원문을 대신 보여주는 영역 */
  translationFallbacks?: string[];
}

async function fetchCelebInfluence(
  celebId: string,
  locale: Locale,
): Promise<CelebInfluenceDetail | null> {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from("celeb_influence")
    .select(`
      celeb_id,
      political,
      political_exp,
      political_exp_en,
      strategic,
      strategic_exp,
      strategic_exp_en,
      tech,
      tech_exp,
      tech_exp_en,
      social,
      social_exp,
      social_exp_en,
      economic,
      economic_exp,
      economic_exp_en,
      cultural,
      cultural_exp,
      cultural_exp_en,
      transhistoricity,
      transhistoricity_exp,
      transhistoricity_exp_en,
      total_score,
      celeb:celebs!celeb_influence_celebs_fkey (
        nickname,
        nickname_en,
        avatar_url,
        profession
      )
    `)
    .eq("celeb_id", celebId)
    .single();

  throwOnQueryError('getCelebInfluence', error, { ignoreCodes: [NO_ROWS_CODE] });
  if (!data) return null;

  // 두 count 쿼리 병렬화 (Promise.all)
  const totalScore = data.total_score ?? 0;
  const [higherResult, totalResult] = await Promise.all([
    supabase
      .from("celeb_influence")
      .select("*", { count: "exact", head: true })
      .gt("total_score", totalScore),
    supabase
      .from("celeb_influence")
      .select("*", { count: "exact", head: true })
      .gt("total_score", 0),
  ]);

  throwOnQueryError('getCelebInfluence/higher-count', higherResult.error);
  throwOnQueryError('getCelebInfluence/total-count', totalResult.error);

  const ranking = (higherResult.count ?? 0) + 1;
  const total = totalResult.count ?? 1;
  const percentile = calculatePercentile(ranking, total);
  const level = getCelebLevelByRanking(ranking, total);

  const profileData = data.celeb as unknown as {
    nickname: string;
    nickname_en: string | null;
    avatar_url: string | null;
    profession: string | null;
  };
  const translationFallbacks: string[] = [];
  const localizedExplanation = (
    field: string,
    ko: string | null,
    en: string | null,
  ) => {
    if (locale !== "en") return ko;
    if (en) return en;
    if (ko) translationFallbacks.push(field);
    return ko;
  };

  return {
    celeb_id: data.celeb_id,
    nickname: locale === "en"
      ? (profileData.nickname_en || profileData.nickname)
      : profileData.nickname,
    avatar_url: profileData.avatar_url,
    profession: profileData.profession,
    political: data.political ?? 0,
    political_exp: localizedExplanation("political", data.political_exp, data.political_exp_en),
    strategic: data.strategic ?? 0,
    strategic_exp: localizedExplanation("strategic", data.strategic_exp, data.strategic_exp_en),
    tech: data.tech ?? 0,
    tech_exp: localizedExplanation("tech", data.tech_exp, data.tech_exp_en),
    social: data.social ?? 0,
    social_exp: localizedExplanation("social", data.social_exp, data.social_exp_en),
    economic: data.economic ?? 0,
    economic_exp: localizedExplanation("economic", data.economic_exp, data.economic_exp_en),
    cultural: data.cultural ?? 0,
    cultural_exp: localizedExplanation("cultural", data.cultural_exp, data.cultural_exp_en),
    transhistoricity: data.transhistoricity ?? 0,
    transhistoricity_exp: localizedExplanation(
      "transhistoricity",
      data.transhistoricity_exp,
      data.transhistoricity_exp_en,
    ),
    total_score: totalScore,
    level,
    ranking,
    percentile,
    rankedTotal: total,
    translationFallbacks,
  };
}

/* 인물 한 명짜리 조회 — 항목 태그를 달아 그 한 명만 비울 수 있게 한다 */
const getCelebInfluenceCached = (...args: Parameters<typeof fetchCelebInfluence>) =>
  cachedDetail(CACHE_TAGS.CELEBS, args[0], ["celeb-influence-detail-v2-query-guards", ...args.map((a) => String(a ?? ''))], () =>
    fetchCelebInfluence(...args),
  );

// React.cache로 같은 RSC 요청 안의 중복 호출 dedup + unstable_cache로 cross-request 캐시
export const getCelebInfluence = cache(async (
  celebId: string,
  locale = "ko",
): Promise<CelebInfluenceDetail | null> => {
  return getCelebInfluenceCached(celebId, resolveLocale(locale));
});
