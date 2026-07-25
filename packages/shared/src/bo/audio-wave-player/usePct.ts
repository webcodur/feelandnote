/** 파형 내 pct 헬퍼 — children에서 사용 */
export function usePct(duration: number) {
  return (t: number) => duration > 0 ? (t / duration) * 100 : 0
}
