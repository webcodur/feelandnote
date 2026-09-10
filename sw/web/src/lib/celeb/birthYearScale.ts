/*
  파일명: /lib/celeb/birthYearScale.ts
  기능: 생년 range slider의 연도 ↔ 트랙 위치(%) 변환
  책임: celebs.birth_date 분포(1900년대에 절반 몰림, BC 22%)를 반영해
        근현대 구간에 트랙 폭을 더 배정하는 구간별(piecewise) 선형 스케일 제공
*/

// [연도, 트랙 위치(%)] — 값 사이는 선형보간. 위 두 값은 실측 분포(전체 3,765명 중
// 1900년대 1,813명·BC 820명) 기준으로 근현대 구간에 폭을 더 준 것이다.
const BREAKPOINTS: [year: number, percent: number][] = [
  [-6000, 0],
  [-1000, 10],
  [0, 20],
  [1000, 35],
  [1500, 50],
  [1800, 65],
  [1900, 80],
  [2000, 93],
  [2030, 100],
];

export const BIRTH_YEAR_MIN = BREAKPOINTS[0][0];
export const BIRTH_YEAR_MAX = BREAKPOINTS[BREAKPOINTS.length - 1][0];

function interpolate(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

export function yearToPercent(year: number): number {
  const clamped = Math.min(BIRTH_YEAR_MAX, Math.max(BIRTH_YEAR_MIN, year));
  for (let i = 0; i < BREAKPOINTS.length - 1; i++) {
    const [y0, p0] = BREAKPOINTS[i];
    const [y1, p1] = BREAKPOINTS[i + 1];
    if (clamped >= y0 && clamped <= y1) {
      return interpolate(clamped, y0, y1, p0, p1);
    }
  }
  return 100;
}

export function percentToYear(percent: number): number {
  const clamped = Math.min(100, Math.max(0, percent));
  for (let i = 0; i < BREAKPOINTS.length - 1; i++) {
    const [y0, p0] = BREAKPOINTS[i];
    const [y1, p1] = BREAKPOINTS[i + 1];
    if (clamped >= p0 && clamped <= p1) {
      return Math.round(interpolate(clamped, p0, p1, y0, y1));
    }
  }
  return BIRTH_YEAR_MAX;
}
