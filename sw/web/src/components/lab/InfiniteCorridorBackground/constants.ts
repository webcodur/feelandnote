// --- Constants ---
export const NUM_SEGMENTS = 10;
export const SEG_DEPTH = 700;
export const TOTAL_DEPTH = NUM_SEGMENTS * SEG_DEPTH;
export const PILLAR_EVERY = 2; // 기둥은 2세그먼트마다 1회
export const FOV = 480;

export const CORRIDOR_ASPECT = 0.85;
export const FLOOR_BIAS = 0.6;

// --- Material palette ---
// 밝기: 기둥 > 벽 > 바닥 > 천장
export const BG = "#0a0a0c";

// BG parsed for RGB lerp
export const BG_R = 10;
export const BG_G = 10;
export const BG_B = 12;

// 기둥: 다듬어진 석재 — 가장 밝고 약간 따뜻한 회색
export const PILLAR_COL = {
  dark:      [50, 46, 42],
  mid:       [78, 73, 67],
  light:     [105, 99, 91],
  highlight: [125, 118, 108],
} as const;

// 벽: 거친 석조 — 어둡고 무거운 톤
export const WALL_COL = {
  dark:      [24, 23, 22],
  mid:       [38, 36, 34],
  light:     [52, 49, 46],
  mortar:    [14, 13, 12],
} as const;

// 바닥: 습기 있는 석판 — 벽보다 어둡고 약간 차가운 톤
export const FLOOR_COL = {
  base:      [42, 41, 40],
  dark:      [26, 25, 25],
  mortar:    [16, 15, 15],
} as const;

// 천장: 빛이 닿지 않는 볼트 — 가장 어두운
export const CEIL_COL = {
  base:      [14, 13, 13],
  deep:      [8, 8, 8],
} as const;

// 아치: 기둥과 천장 사이 중간
export const ARCH_COL = {
  mid:       [80, 74, 66],
} as const;

// 기둥 돌출 비율
export const PILLAR_PROTRUDE = 0.14; // 벽 폭 대비 돌출 비율
export const PILLAR_Z_THICK = 0.35;  // SEG_DEPTH 대비 Z 두께 (큰 값 = 두꺼운 기둥)

// 바닥 석판 그리드
export const FLOOR_ROWS = 3;
export const FLOOR_COLS = 6;
