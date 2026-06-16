/*
  파일명: /components/features/user/explore/personaAnalysis/constants.ts
  기능: 성향 분포 공용 상수·색 유틸
  책임: 분포 레이아웃 수치, 양극 8색, 색 보간·이니셜 헬퍼 단일원천.
*/ // ------------------------------

export const DOT = 40; // 아바타 지름(px)
export const GAP_Y = 6; // 세로 간격
export const STEP = 3; // 같은 칸으로 묶는 값 폭
export const AXIS_BOTTOM = 34; // 축선까지 바닥 여백(px)
export const MAX_STACK = 10; // 한 칸에 쌓는 점 최대 수 (초과분은 +N)
export const SEARCH_LIMIT = 8; // 검색 결과 최대 표시 수

// 성향 4지표 × 양극 = 8색. 축마다 좌(neg)·우(pos) 끝 색
export const AXIS_POLE_COLORS: Record<string, { neg: string; pos: string }> = {
  pessimism_optimism: { neg: "#64748b", pos: "#fbbf24" }, // 비관(회청) ↔ 낙관(노랑)
  conservative_progressive: { neg: "#0ea5e9", pos: "#f43f5e" }, // 보수(청) ↔ 진취(로즈)
  individual_social: { neg: "#a855f7", pos: "#22c55e" }, // 개인(보라) ↔ 공동체(초록)
  cautious_bold: { neg: "#3b82f6", pos: "#f97316" }, // 신중(파랑) ↔ 과감(주황)
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** 두 색 사이를 t(0~1)로 보간 */
export function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function initials(name: string): string {
  return name.trim().slice(0, 2);
}
