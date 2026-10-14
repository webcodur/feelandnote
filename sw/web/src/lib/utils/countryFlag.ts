import { hasFlag } from "country-flag-icons";

// 라이브러리에 실제 국기가 있는 코드만 반환한다. 미확인·역사적 국적은 치환하지 않는다.
export function getCountryFlagCode(code: string | null | undefined): string | null {
  const normalized = code?.trim().toUpperCase();
  return normalized && hasFlag(normalized) ? normalized : null;
}
