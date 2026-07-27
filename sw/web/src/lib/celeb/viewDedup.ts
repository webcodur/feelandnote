'use client'

/**
 * 인물 화면 조회수 중복 방지 (클라이언트 전용).
 * 같은 브라우저에서 30분 내 재방문은 세지 않는다 — 웹 분석 표준(접속 한 묶음 = 30분 무동작)에 맞춘 값이다.
 * 24시간은 순 방문자(UV) 집계 기준이라 "조회수" 칸에 쓰면 값이 비상식적으로 작아진다. 게시판 쪽은 24시간 그대로다.
 * 저장소를 못 쓰는 환경(크롤러 등)에서는 세지 않는 쪽으로 판단한다.
 */
const VIEW_DEDUP_MS = 30 * 60 * 1000

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
