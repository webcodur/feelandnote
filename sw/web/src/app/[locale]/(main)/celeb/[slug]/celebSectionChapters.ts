/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 구획 장번호·정렬 순서 정의
 * - 목차 위치: 공통 (전 구획)
 * - 데이터: CelebReality (standard/fiction 순서 분기)
 * - 함께 보기: celebServiceItems.ts
 * ───────────────────────────────────────────── */
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";

export const CELEB_SERVICE_CHAPTERS = {
  introduction: "01",
  personGuide: "02",
  readingWay: "03",
  virtualMonologue: "04",
  library: "05",
  analysis: "06",
  connections: "07",
  guestbook: "08",
} as const;

/* 책장(library)은 감상 기록과 참고도서를 함께 담는다.
   꼬리는 관련 인물→연결된 세력→방명록 순이고 방명록이 맨 끝이다.
   본문 구획 순서(CelebRecordSections)와 반드시 같게 둔다 */
const STANDARD_SECTION_ORDER = [
  "introduction",
  "personGuide",
  "readingWay",
  "virtualMonologue",
  "library",
  "filmography",
  "analysis",
  "connections",
  "relatedFigures",
  "relatedFactions",
  "guestbook",
] as const;

const FICTION_SECTION_ORDER = [
  "introduction",
  "personGuide",
  "virtualMonologue",
  "connections",
  "library",
  "relatedFigures",
  "relatedFactions",
  "guestbook",
] as const;

// 순수 전승(FICTION)만 이 순서를 쓴다. BOTH는 실존 핵심이 있어 영향력·서고 구획이
// 채워질 수 있으므로 STANDARD 순서를 그대로 쓴다.
export function getCelebSectionOrder(reality: CelebReality): readonly string[] {
  return reality === "FICTION" ? FICTION_SECTION_ORDER : STANDARD_SECTION_ORDER;
}
