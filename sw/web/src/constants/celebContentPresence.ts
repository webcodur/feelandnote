/** 카드의 작품수와 같은 기준. 0·조사 완료(-1)는 모두 등록된 작품이 없는 인물이다. */
export const CELEB_CONTENT_PRESENCE = ["all", "with", "without"] as const;
export type CelebContentPresence = typeof CELEB_CONTENT_PRESENCE[number];
export const DEFAULT_CELEB_CONTENT_PRESENCE: CelebContentPresence = "with";

export function parseCelebContentPresence(value: unknown, fallback: CelebContentPresence = "all"): CelebContentPresence {
  return value === "all" || value === "with" || value === "without" ? value : fallback;
}
