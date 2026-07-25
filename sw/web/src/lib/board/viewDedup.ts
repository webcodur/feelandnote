'use client'

/**
 * 자유게시판 조회수 중복 방지 (클라이언트 전용).
 * 같은 브라우저에서 24시간 내 재조회는 세지 않는다.
 * 홈 아코디언과 상세 페이지가 같은 기록을 공유해 이중 집계를 막는다.
 */
const VIEW_DEDUP_MS = 24 * 60 * 60 * 1000

export const shouldCountView = (postId: string): boolean => {
  try {
    const key = `free-post-view:${postId}`
    const last = Number(localStorage.getItem(key))
    if (last && Date.now() - last < VIEW_DEDUP_MS) return false
    localStorage.setItem(key, String(Date.now()))
    return true
  } catch {
    return false
  }
}
