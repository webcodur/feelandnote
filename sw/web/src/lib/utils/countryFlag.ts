/**
 * ISO 3166-1 alpha-2 국가 코드 → 국기 이모지 변환
 * Regional Indicator Symbol 사용: A=🇦(U+1F1E6) ~ Z=🇿(U+1F1FF)
 */
export function getCountryFlag(isoCode: string): string {
  if (!isoCode || isoCode === "all" || isoCode.length !== 2) return "";
  const upper = isoCode.toUpperCase();
  const offset = 0x1F1E6 - 65; // 'A' = 65
  return String.fromCodePoint(
    upper.charCodeAt(0) + offset,
    upper.charCodeAt(1) + offset,
  );
}
