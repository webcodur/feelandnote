/*
  오라 시스템 진입점 - 기존 `@/constants/materials` 경로 호환용 재export
*/

export type { MaterialKey, Aura, CelebLevel, NormalLevel, MaterialConfig } from "./types";
export { MATERIALS } from "./registry";
export {
  MATERIAL_ORDER,
  AURA_ORDER_DESC,
  NORMAL_LEVEL_TO_MATERIAL,
  getAuraByPercentile,
  calculatePercentile,
  getAuraByScore,
  getMaterialFromAura,
  getMaterialConfigByScore,
  getCelebLevelByRanking,
} from "./helpers";
