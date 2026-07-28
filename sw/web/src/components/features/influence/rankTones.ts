import type { InfluenceRank } from "@feelandnote/influence-constants";

/**
 * 등급 배지 색 — 옆에 선 머리글 아이콘들과 같은 문법(옅은 배경 + 얇은 테두리 + 같은 색 글자)을 쓰되
 * 등급마다 색조만 달리한다. 진한 그라데이션 배지는 헤더 줄에서 홀로 튀어 쓰지 않는다.
 */
export const RANK_BADGE_TONES: Record<InfluenceRank, string> = {
  S: "border-sky-300/50 bg-sky-400/18 text-sky-200",
  A: "border-accent-dim/50 bg-accent/18 text-accent",
  B: "border-slate-300/45 bg-slate-300/16 text-slate-100",
  C: "border-amber-600/55 bg-amber-600/20 text-amber-400",
  D: "border-white/25 bg-white/12 text-text-primary",
};
