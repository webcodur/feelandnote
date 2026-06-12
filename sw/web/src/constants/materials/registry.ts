/*
  재질 레지스트리 - 등급별 재질 정의를 단일 레코드로 결합
*/

import type { MaterialConfig, MaterialKey } from "./types";
import { wood, stone, bronze, silver, gold } from "./grades-metal";
import { emerald, crimson, diamond, holographic, obsidian } from "./grades-gem";

// #region 재질 설정 (9등급제)
export const MATERIALS: Record<MaterialKey, MaterialConfig> = {
  wood,
  stone,
  bronze,
  silver,
  gold,
  emerald,
  crimson,
  diamond,
  holographic,
  obsidian,
};
// #endregion
