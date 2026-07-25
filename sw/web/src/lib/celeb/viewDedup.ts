'use client'

/**
 * 인물 화면 조회수 중복 방지 (클라이언트 전용).
 * 같은 브라우저에서 24시간 내 재방문은 세지 않는다.
 * 저장소를 못 쓰는 환경(크롤러 등)에서는 세지 않는 쪽으로 판단한다.
 */
const VIEW_DEDUP_MS = 24 * 60 * 60 * 1000

export const shouldCountCelebView = (celebId: string): boolean => {
  try {
    const key = `celeb-view:${celebId}`
    const last = Number(localStorage.getItem(key))
    if (last && Date.now() - last < VIEW_DEDUP_MS) return false
    localStorage.setItem(key, String(Date.now()))
    return true
  } catch {
    return false
  }
}
