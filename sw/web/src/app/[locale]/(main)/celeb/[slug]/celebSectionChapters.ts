/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 구획 장번호·정렬 순서 정의
 * - 목차 위치: 공통 (전 구획)
 * - 데이터: CelebTier (standard/fiction 순서 분기)
 * - 함께 보기: celebServiceItems.ts
 * ───────────────────────────────────────────── */
import type { CelebTier } from "@feelandnote/shared/constants/celeb-tiers";

export const CELEB_SERVICE_CHAPTERS = {
  introduction: "01",
  reading: "02",
  timeline: "03",
  library: "04",
  analysis: "05",
  connections: "06",
  media: "07",
  guestbook: "08",
} as const;

const STANDARD_SECTION_ORDER = [
  "introduction",
  "reading",
  "timeline",
  "library",
  "sourceWorks",
  "analysis",
  "connections",
  "media",
  "guestbook",
] as const;

const FICTION_SECTION_ORDER = [
  "introduction",
  "reading",
  "timeline",
  "connections",
  "sourceWorks",
  "media",
  "guestbook",
] as const;

export function getCelebSectionOrder(tier: CelebTier): readonly string[] {
  return tier === "fiction" ? FICTION_SECTION_ORDER : STANDARD_SECTION_ORDER;
}
