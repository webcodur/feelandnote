/*
  오라·재질 헬퍼 - 조회 유틸리티 및 등급 계산 함수
*/

import type { Aura, CelebLevel, MaterialConfig, MaterialKey, NormalLevel } from "./types";
import { MATERIALS } from "./registry";

// #region 유틸리티

// 재질 순서 (등급순 - 낮은 순 → 높은 순)
export const MATERIAL_ORDER: MaterialKey[] = [
  "wood", "stone", "bronze", "silver", "gold", "emerald", "crimson", "diamond", "holographic"
];

// 오라로 재질 조회
const getMaterialByAura = (aura: Aura): MaterialConfig => {
  const auraMap: Record<Aura, MaterialKey> = {
    1: "wood",
    2: "stone",
    3: "bronze",
    4: "silver",
    5: "gold",
    6: "emerald",
    7: "crimson",
    8: "diamond",
    9: "holographic",
  };
  return MATERIALS[auraMap[aura]];
};

// 오라 순서 (높은 순 → 낮은 순 - 차트/랭킹 등 상위권 우선 노출 시 사용)
export const AURA_ORDER_DESC: Aura[] = [9, 8, 7, 6, 5, 4, 3, 2, 1];

export const NORMAL_LEVEL_TO_MATERIAL: Record<NormalLevel, MaterialConfig> = {
  PROPHET: MATERIALS.gold,
  PRIEST: MATERIALS.silver,
  PILGRIM: MATERIALS.bronze,
  NOVICE: MATERIALS.stone,
  MORTAL: MATERIALS.wood,
};

// #endregion

// #region 오라 백분위 임계값 (수능식 등급 컷)
/**
 * percentile(상위 몇 %)로 오라 계산
 * @param percentile 상위 몇 % (0~100)
 */
export function getAuraByPercentile(percentile: number): Aura {
  if (percentile <= 4) return 9;
  if (percentile <= 11) return 8;
  if (percentile <= 23) return 7;
  if (percentile <= 40) return 6;
  if (percentile <= 60) return 5;
  if (percentile <= 77) return 4;
  if (percentile <= 89) return 3;
  if (percentile <= 96) return 2;
  return 1;
}

/**
 * 순위와 전체 수로 percentile 계산
 */
export function calculatePercentile(ranking: number, total: number): number {
  if (total <= 0) return 100;
  return (ranking / total) * 100;
}

/**
 * 점수(0~100)로 오라 계산 (81~: 9등급, 71~: 8등급 ...)
 * @param score 총점 (0~100)
 */
export function getAuraByScore(score: number): Aura {
  if (score >= 81) return 9;
  if (score >= 71) return 8;
  if (score >= 61) return 7;
  if (score >= 51) return 6;
  if (score >= 41) return 5;
  if (score >= 31) return 4;
  if (score >= 21) return 3;
  if (score >= 11) return 2;
  return 1;
}

/**
 * Aura → MaterialConfig 변환
 */
export function getMaterialFromAura(aura: Aura): MaterialConfig {
  return getMaterialByAura(aura);
}

/**
 * score → MaterialConfig 변환
 * @param score 총점 (0~100)
 */
export function getMaterialConfigByScore(score: number): MaterialConfig {
  const aura = getAuraByScore(score);
  return getMaterialByAura(aura);
}

// 하위 호환용 (deprecated)
function getCelebLevelByPercentile(percentile: number): CelebLevel {
  if (percentile <= 4) return "COSMIC";
  if (percentile <= 11) return "TITAN";
  if (percentile <= 23) return "GIGANTIC";
  if (percentile <= 40) return "SAGE";
  return "HERO";
}

export function getCelebLevelByRanking(ranking: number, total: number): CelebLevel {
  const percentile = calculatePercentile(ranking, total);
  return getCelebLevelByPercentile(percentile);
}
// #endregion
