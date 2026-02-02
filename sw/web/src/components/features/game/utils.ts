/*
  파일명: components/features/game/utils.ts
  기능: 게임 공통 유틸리티 함수
  책임: 연도 파싱, 퍼블릭 도메인 판별 등
*/ // ------------------------------

// 사망 연도 파싱 (birth_date와 동일한 형식 지원)
export function parseDeathYear(deathDate: string | null): number | null {
  if (!deathDate) return null;

  // "-399" 또는 "-43-12-07" 형식 (BC)
  if (deathDate.startsWith("-")) {
    const match = deathDate.match(/^-(\d+)/);
    return match ? -parseInt(match[1], 10) : null;
  }

  // "1519-05-02" 또는 "1783" 형식
  const yearMatch = deathDate.match(/^(\d{4})/);
  return yearMatch ? parseInt(yearMatch[1], 10) : null;
}

// 퍼블릭 도메인 셀럽 판별 (1920년 이전 사망)
export function isPublicDomainCeleb(deathDate: string | null): boolean {
  const deathYear = parseDeathYear(deathDate);
  return deathYear !== null && deathYear <= 1920;
}

// 퍼블릭 도메인 안내 문구
export const PUBLIC_DOMAIN_NOTICE =
  "이 게임에는 저작권·초상권 보호를 위해 1920년 이전에 사망한 역사적 인물만 등장합니다.";
