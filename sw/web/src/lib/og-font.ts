const PRETENDARD_BOLD_URL =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/woff2/Pretendard-Bold.woff2";

/** OG 이미지도 화면과 같은 Pretendard를 쓰되, CDN 실패 시 시스템 sans로 안전하게 폴백한다. */
export async function loadPretendardBold(): Promise<ArrayBuffer | null> {
  const response = await fetch(PRETENDARD_BOLD_URL);
  if (!response.ok) return null;
  return response.arrayBuffer();
}
