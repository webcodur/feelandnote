/*
  파일명: /components/features/user/explore/sections/TimelineSection/utils.ts
  기능: 연대기 연도·시대 계산 유틸
  책임: 연도 추출/포맷 + 시대 구분 + 생몰 표시 + 동시대 인물 탐색.
*/ // ------------------------------

import type { TimelineCeleb } from "@/actions/home";

/** birth_date에서 연도 추출. BC 표기("-0500-01-01")도 처리 */
export function getYear(dateStr: string): number {
  if (dateStr.startsWith("-")) {
    return -parseInt(dateStr.slice(1, 5), 10);
  }
  return parseInt(dateStr.slice(0, 4), 10);
}

/** 연도를 표시용 문자열로 변환 */
export function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `${year}`;
}

export interface EraInfo {
  key: string;
  label: string;
  labelEn: string;
  range: string;
}

/** 연도를 시대 정보로 변환 (현대 세분화) */
export function getEraInfo(year: number): EraInfo {
  if (year < 500) return { key: "ancient", label: "고대", labelEn: "Ancient", range: "~ 500" };
  if (year < 1500) return { key: "medieval", label: "중세", labelEn: "Medieval", range: "500 ~ 1500" };
  if (year < 1800) return { key: "early-modern", label: "근세", labelEn: "Early Modern", range: "1500 ~ 1800" };
  if (year < 1900) return { key: "modern", label: "근대", labelEn: "Modern", range: "1800 ~ 1900" };
  if (year < 1950) return { key: "contemporary-1", label: "현대 전기", labelEn: "Early 20C", range: "1900 ~ 1950" };
  if (year < 2000) return { key: "contemporary-2", label: "현대 후기", labelEn: "Late 20C", range: "1950 ~ 2000" };
  return { key: "contemporary-3", label: "21세기", labelEn: "21st Century", range: "2000 ~" };
}

/** 생몰 표시 */
export function formatLifespan(birth: string | null, death: string | null): string {
  if (!birth) return "";
  const bYear = getYear(birth);
  const bStr = formatYear(bYear);
  if (!death) return `${bStr} ~`;
  const dYear = getYear(death);
  return `${bStr} ~ ${formatYear(dYear)}`;
}

/** 생애가 겹치는 타국 인물 탐색 (full 티어 우선, 출생연도 근접순, 최대 5명) */
export function findContemporaries(
  celebs: TimelineCeleb[],
  celeb: TimelineCeleb,
  selectedCountry: string
): TimelineCeleb[] {
  const bYear = getYear(celeb.birth_date!);
  const dYear = celeb.death_date ? getYear(celeb.death_date) : bYear + 70;

  return celebs
    .filter((c) => {
      if (c.id === celeb.id || !c.birth_date) return false;
      if (c.nationality === selectedCountry) return false; // 현재 보고 있는 국가 제외
      const cBirth = getYear(c.birth_date);
      const cDeath = c.death_date ? getYear(c.death_date) : cBirth + 70;
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
