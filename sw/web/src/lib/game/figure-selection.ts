/** 게임의 무작위 인물 풀에서 사용하는 연대 기준과 조회 상한. */
export const GAME_FIGURE_RULES = {
  latestDeathYear: 1920,
  candidateScanLimit: 3000,
  memoryPoolSize: 600,
  portraitPoolSize: 600,
  distractorPoolSize: 600,
} as const;

export interface GameFigureProfile {
  death_date: string | null;
}

/** 몰년 불명·생존 인물은 추정으로 통과시키지 않는다. 기원전과 연도만 있는 날짜도 지원한다. */
export function isHistoricalGameFigure(deathDate: string | null): boolean {
  if (!deathDate) return false;
  const match = /^(-?\d{1,6})(?:-\d{1,2}(?:-\d{1,2})?)?$/.exec(deathDate.trim());
  if (!match) return false;
  const year = Number(match[1]);
  return year !== 0 && year <= GAME_FIGURE_RULES.latestDeathYear;
}

/** 게임별 추가 조건·정원 적용 전에 공통 자격을 거른다. */
export function selectGameFigures<T>(rows: readonly T[], profileOf: (row: T) => GameFigureProfile | null | undefined): T[] {
  return rows.filter((row) => {
    const profile = profileOf(row);
    return !!profile && isHistoricalGameFigure(profile.death_date);
  });
}
