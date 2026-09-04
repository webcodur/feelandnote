/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 구획 장번호·정렬 순서 정의
 * - 목차 위치: 공통 (전 구획)
 * - 데이터: CelebReality (standard/fiction 순서 분기)
 * - 함께 보기: celebServiceItems.ts
 * ───────────────────────────────────────────── */
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";

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

// 순수 전승(FICTION)만 이 순서를 쓴다. BOTH는 실존 핵심이 있어 영향력·서고 구획이
// 채워질 수 있으므로 STANDARD 순서를 그대로 쓴다.
export function getCelebSectionOrder(reality: CelebReality): readonly string[] {
  return reality === "FICTION" ? FICTION_SECTION_ORDER : STANDARD_SECTION_ORDER;
}
