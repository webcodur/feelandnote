'use client'

/**
 * 인물·신화·세력 화면 조회수 중복 방지 (클라이언트 전용).
 * 같은 브라우저에서 30분 내 재방문은 세지 않는다 — 웹 분석 표준(접속 한 묶음 = 30분 무동작)에 맞춘 값이다.
 * 24시간은 순 방문자(UV) 집계 기준이라 "조회수" 칸에 쓰면 값이 비상식적으로 작아진다. 게시판 쪽은 24시간 그대로다.
 * 저장소를 못 쓰는 환경(크롤러 등)에서는 세지 않는 쪽으로 판단한다.
 */
const VIEW_DEDUP_MS = 30 * 60 * 1000

const pendingViews = new Map<string, Promise<number | null>>()

function shouldCountPageView(key: string): boolean {
  try {
    const last = Number(localStorage.getItem(key))
    if (last && Date.now() - last < VIEW_DEDUP_MS) return false
    return true
  } catch {
    return false
  }
}

/** 서버가 정상 반영한 뒤에만 완료 시각을 저장하고, 중복 마운트는 진행 중인 요청을 공유한다. */
export function recordPageView(
  kind: 'celeb' | 'faction',
  id: string,
  record: (id: string, count: boolean) => Promise<number | null>,
): Promise<number | null> {
  const key = `${kind}-view:${id}`
  const pending = pendingViews.get(key)
  if (pending) return pending
  const count = shouldCountPageView(key)
  const request = Promise.resolve().then(() => record(id, count)).then(views => {
    if (count && typeof views === 'number' && Number.isFinite(views)) {
      try { localStorage.setItem(key, String(Date.now())) } catch { /* 저장소 제한은 숫자 표시를 막지 않는다. */ }
    }
    return views
  }).finally(() => { pendingViews.delete(key) })
  pendingViews.set(key, request)
  return request
}
