/*
  EyeOfTime 공유 타입 · 상수 · 유틸
*/

export type Phase = "range" | "balance";
export type Result = "perfect" | "good" | "miss" | null;

export interface EyeOfTimeProps {
  boardYears: number[];
  correctYear: number;
  celebName: string;
  onPerfect: () => void;
  onGood: (correctIndex: number) => void;
  onMiss: () => void;
  onCancel: () => void;
}

// ── 난이도 스케일링 (범위 폭 기반) ──
// holdBase < |drift| 이므로 누르기만으로는 밀림을 완전히 상쇄 못함
// holdRamp: 누를수록 우측 가속 — 타이밍 있는 탭핑이 핵심
export interface DifficultyParams {
  drift: number;
  holdBase: number;
  holdRamp: number;
  duration: number;
  safeStart: number;
  safeEnd: number;
  windInterval: number;
  windRange: [number, number];
  labelKey: string;
}

export function getDifficultyParams(rangeWidth: number): DifficultyParams {
  if (rangeWidth >= 1500)
    return {
      drift: -3.8, holdBase: 3.2, holdRamp: 8.0,
      duration: 6, safeStart: 0.46, safeEnd: 0.54,
      windInterval: 60, windRange: [-3.0, 1.5],
      labelKey: "extreme",
    };
  if (rangeWidth >= 800)
    return {
      drift: -2.8, holdBase: 2.4, holdRamp: 6.0,
      duration: 5, safeStart: 0.44, safeEnd: 0.56,
      windInterval: 90, windRange: [-2.2, 1.2],
      labelKey: "hard",
    };
  if (rangeWidth >= 300)
    return {
      drift: -2.0, holdBase: 1.7, holdRamp: 4.5,
      duration: 4.5, safeStart: 0.42, safeEnd: 0.58,
      windInterval: 130, windRange: [-1.6, 0.8],
      labelKey: "normal",
    };
  return {
    drift: -1.5, holdBase: 1.3, holdRamp: 3.2,
    duration: 4, safeStart: 0.40, safeEnd: 0.60,
    windInterval: 170, windRange: [-1.2, 0.6],
    labelKey: "easy",
  };
}

export function getDifficultyStars(rangeWidth: number): number {
  if (rangeWidth >= 1500) return 5;
  if (rangeWidth >= 800) return 4;
  if (rangeWidth >= 300) return 3;
  if (rangeWidth >= 100) return 2;
  return 1;
}

export function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `AD ${year}`;
}

// ── 균형 게임 상수 (고정) ──
export const DAMPING = 2.0; // 낮을수록 반응 빠름, 돌풍이 더 크게 튐
export const OVERSHOOT_PULL = 3.0; // 우측 초과 복원력
export const PERFECT_SHRINK = 0.1;
