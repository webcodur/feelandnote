// URL 관련 유틸리티 함수

/**
 * URL에서 도메인 추출 (www 제거)
 */
export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
