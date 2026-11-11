/*
  파일명: /components/features/user/explore/sections/TimelineSection/utils.ts
  기능: 연대기 연도·시대 계산 유틸
  책임: 연도 추출/포맷 + 시대 구분 + 생몰 표시 + 동시대 인물 탐색.
*/ // ------------------------------

import type { TimelineCeleb } from "@/actions/home";
import {
  getCelebLifeEndYear,
  getCelebYear,
  isCelebDeceased,
} from "@/lib/celeb/lifespan";

/** birth_date에서 연도 추출. BC 표기("-0500-01-01")도 처리 */
export function getYear(dateStr: string): number {
  return getCelebYear(dateStr) ?? NaN;
}

/** 연도를 표시용 문자열로 변환 */
export function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `${year}`;
}

export interface EraInfo {
  key: string;
  range: string;
}

/** 시대 구분(현대 세분화). 각 시대는 앞 시대의 end부터 자기 end 직전까지다. 연표·지구본이 함께 쓴다 */
export const ERAS = [
  { key: "ancient", end: 500 },
  { key: "medieval", end: 1500 },
  { key: "early-modern", end: 1800 },
  { key: "modern", end: 1900 },
  { key: "contemporary-1", end: 1950 },
  { key: "contemporary-2", end: 2000 },
  { key: "contemporary-3", end: null },
] as const;

/** 시대의 생년 범위(양 끝 포함). 첫 시대는 하한, 끝 시대는 상한이 없다 */
export function eraYearRange(index: number): { min?: number; max?: number } {
  const end = ERAS[index].end;
  return { min: index > 0 ? ERAS[index - 1].end ?? undefined : undefined, max: end === null ? undefined : end - 1 };
}

/** 연도를 시대 정보로 변환 */
export function getEraInfo(year: number): EraInfo {
  const index = ERAS.findIndex(era => era.end === null || year < era.end);
  const start = index > 0 ? ERAS[index - 1].end : null;
  const end = ERAS[index].end;
  return { key: ERAS[index].key, range: [start ?? "", end ?? ""].join(" ~ ").trim() };
}

/** 생몰 표시. 몰년을 모르는 사망자에게 "~"를 달면 살아 있는 것처럼 읽힌다 */
export function formatLifespan(birth: string | null, death: string | null): string {
  if (!birth) return "";
  const bStr = formatYear(getYear(birth));
  if (death) return `${bStr} ~ ${formatYear(getYear(death))}`;
  return isCelebDeceased(birth, death) ? bStr : `${bStr} ~`;
}

/** 생애가 겹치는 타국 인물 탐색 (full 티어 우선, 출생연도 근접순, 최대 5명) */
export function findContemporaries(
  celebs: TimelineCeleb[],
  celeb: TimelineCeleb,
  selectedCountry: string
): TimelineCeleb[] {
  const bYear = getYear(celeb.birth_date!);
  const dYear = getCelebLifeEndYear(celeb.birth_date, celeb.death_date) ?? bYear;

  return celebs
    .filter((c) => {
      if (c.id === celeb.id || !c.birth_date) return false;
      if (c.nationality === selectedCountry) return false; // 현재 보고 있는 국가 제외
      const cBirth = getYear(c.birth_date);
      const cDeath = getCelebLifeEndYear(c.birth_date, c.death_date) ?? cBirth;
      return bYear <= cDeath && dYear >= cBirth;
    })
    .sort((a, b) => {
      const tierA = a.celeb_tier === "full" ? 0 : 1;
      const tierB = b.celeb_tier === "full" ? 0 : 1;
      if (tierA !== tierB) return tierA - tierB;
      return Math.abs(getYear(a.birth_date!) - bYear) - Math.abs(getYear(b.birth_date!) - bYear);
    })
    .slice(0, 5);
}
