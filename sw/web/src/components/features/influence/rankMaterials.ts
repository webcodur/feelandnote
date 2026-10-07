import type { CSSProperties } from "react";
import type { InfluenceRank } from "@feelandnote/influence-constants";
import { MATERIALS, type MaterialKey } from "@/constants/materials";

// 랩실 재질을 영향력의 다섯 등급에 연결한다. 점수 기준은 영향력 상수를 따른다.
export const INFLUENCE_RANK_MATERIALS: Record<InfluenceRank, MaterialKey> = {
  S: "holographic",
  A: "diamond",
  B: "crimson",
  C: "gold",
  D: "silver",
};

export function getInfluenceRankMaterial(rank: InfluenceRank) {
  return MATERIALS[INFLUENCE_RANK_MATERIALS[rank]];
}

export function getInfluenceRankStyle(rank: InfluenceRank): CSSProperties {
  const material = getInfluenceRankMaterial(rank);
  return {
    "--rank-accent": rank === "S" ? material.colors.border : material.colors.light,
    "--rank-border": material.gradient.border,
    "--rank-surface": material.gradient.surface,
    "--rank-ink": rank === "S" ? material.colors.text : rank === "C" || rank === "D" ? "var(--color-bg-secondary)" : material.colors.textOnSurface,
  } as CSSProperties;
}
