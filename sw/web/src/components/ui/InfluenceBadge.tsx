/*
  영향력 뱃지 - FramePreview.CombinedBadge 래퍼
  - Grade (1-9) → MaterialConfig 매핑 (9등급 시스템)
  - 클릭 핸들러 지원
*/
"use client";

import { CombinedBadge } from "@/components/lab/FramePreview";
import { getMaterialByAura, type Aura, type CelebLevel, CELEB_LEVEL_TO_MATERIAL } from "@/constants/materials";

// #region Types
interface InfluenceBadgeProps {
  /** 오라 (1-9) - 내부용 */
  aura: Aura;
  /** 크기 */
  size?: "sm" | "md" | "lg";
  /** 클릭 핸들러 */
  onClick?: (e: React.MouseEvent) => void;
  /** 추가 클래스 */
  className?: string;
}
// #endregion

export default function InfluenceBadge({
  aura,
  size = "md",
  onClick,
  className = "",
}: InfluenceBadgeProps) {
  const mat = getMaterialByAura(aura);

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        transition-transform duration-200
        ${onClick ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default"}
        ${className}
      `}
    >
      <CombinedBadge mat={mat} size={size} />
    </button>
  );
}

// #region Legacy 호환 (기존 S/A/B/C/D → Aura 변환)
const LEGACY_RANK_TO_AURA: Record<string, Aura> = {
  S: 9,  // COSMIC → holographic
  A: 7,  // TITAN → crimson
  B: 5,  // GIGANTIC → gold
  C: 3,  // SAGE → bronze
  D: 1,  // HERO → wood
};

export function convertLegacyRankToAura(rank: string | undefined): Aura {
  const r = rank?.toUpperCase() || "D";
  return LEGACY_RANK_TO_AURA[r] || 1;
}

// 기존 API 호환용 래퍼 (CelebLevel 사용하는 곳용)
export function LegacyInfluenceBadge({
  level,
  ...props
}: Omit<InfluenceBadgeProps, "aura"> & { level?: CelebLevel }) {
  const CELEB_LEVEL_TO_AURA: Record<CelebLevel, Aura> = {
    COSMIC: 9,
    TITAN: 7,
    GIGANTIC: 5,
    SAGE: 3,
    HERO: 1,
  };
  const aura = level ? CELEB_LEVEL_TO_AURA[level] : 1;
  return <InfluenceBadge aura={aura} {...props} />;
}
// #endregion

export type { InfluenceBadgeProps, Aura };
