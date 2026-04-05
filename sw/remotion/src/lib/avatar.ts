/** 모듈 로드 시 1회 계산 — 매 프레임 재요청 방지 */
const CACHE_BUSTER = Date.now()

/** avatar_url의 ?v= 타임스탬프를 현재 값으로 교체 */
export function freshAvatarUrl(url: string): string {
  return url.replace(/\?v=\d+/, `?v=${CACHE_BUSTER}`)
}
