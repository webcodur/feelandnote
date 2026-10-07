import { parseCelebTiers } from "@feelandnote/shared/constants/celeb-tiers";

/** 카드의 작품수와 같은 기준. 0·조사 완료(-1)는 모두 등록된 작품이 없는 인물이다. */
export const CELEB_CONTENT_PRESENCE = ["all", "with", "without"] as const;
export type CelebContentPresence = typeof CELEB_CONTENT_PRESENCE[number];
export const DEFAULT_CELEB_CONTENT_PRESENCE: CelebContentPresence = "all";
export const DEFAULT_EXPLORE_CONTENT_PRESENCE: CelebContentPresence = "with";

export function parseCelebContentPresence(value: unknown, fallback: CelebContentPresence = "all"): CelebContentPresence {
  return value === "all" || value === "with" || value === "without" ? value : fallback;
}

/** 이전 수록 필터 주소도 리뷰 선택 하나로 복원한다. 명시된 리뷰 조건이 우선한다. */
export function parseExploreContentPresence(value: unknown, legacyTier: unknown): CelebContentPresence {
  if (CELEB_CONTENT_PRESENCE.some(option => option === value)) return value as CelebContentPresence;
  const tiers = parseCelebTiers(typeof legacyTier === "string" ? legacyTier : undefined);
  if (tiers?.length === 1) return tiers[0] === "full" ? "with" : "without";
  if (tiers?.length) return "all";
  return DEFAULT_EXPLORE_CONTENT_PRESENCE;
}
