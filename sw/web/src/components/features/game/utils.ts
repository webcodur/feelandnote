/*
  파일명: components/features/game/utils.ts
  기능: 게임 공통 유틸리티 함수
  책임: 연도 파싱, 퍼블릭 도메인 판별 등
*/ // ------------------------------

// 사망 연도 파싱 (birth_date와 동일한 형식 지원)
function parseDeathYear(deathDate: string | null): number | null {
  if (!deathDate) return null;

  // "-399" 또는 "-43-12-07" 형식 (BC)
  if (deathDate.startsWith("-")) {
    const match = deathDate.match(/^-(\d+)/);
    return match ? -parseInt(match[1], 10) : null;
  }

  // "1519-05-02", "1783", "220" 등 1~4자리 연도 형식
  const yearMatch = deathDate.match(/^(\d{1,4})/);
  return yearMatch ? parseInt(yearMatch[1], 10) : null;
}

// 퍼블릭 도메인 셀럽 판별 (1920년 이전 사망)
export function isPublicDomainCeleb(deathDate: string | null): boolean {
  const deathYear = parseDeathYear(deathDate);
  return deathYear !== null && deathYear <= 1920;
}

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
