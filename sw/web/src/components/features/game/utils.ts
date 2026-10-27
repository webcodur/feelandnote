/*
  파일명: components/features/game/utils.ts
  기능: 게임 공통 유틸리티 함수
  책임: 연도 파싱, 퍼블릭 도메인 판별 등
*/ // ------------------------------

export { isHistoricalGameFigure as isPublicDomainCeleb } from "@/lib/game/figure-selection";

function getOrdinal(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

// 연도 → 세기 변환
export function getCentury(year: number, locale = "ko"): string {
  const century = Math.ceil(Math.abs(year) / 100);

  if (locale === "en") {
    return year < 0 ? `${getOrdinal(century)} century BC` : `${getOrdinal(century)} century`;
  }

  if (year < 0) return `기원전 ${century}세기`;
  return `${century}세기`;
}
