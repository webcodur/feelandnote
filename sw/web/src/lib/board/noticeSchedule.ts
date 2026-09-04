/*
  파일명: /lib/board/noticeSchedule.ts
  기능: 공지 예약 발행의 노출 경계
  책임: created_at을 발행 시각으로 삼는다. 미래면 아직 안 올라간 공지다.
        새 컬럼을 만들지 않고 이미 있는 값 하나로 예약을 처리한다.
*/

/**
 * 노출 경계를 자르는 폭.
 * 경계를 초 단위로 두면 요청마다 캐시 키가 갈라져 공지 목록 캐시가 무너진다.
 * 이 폭으로 뭉쳐 같은 구간의 방문자가 같은 캐시를 쓰게 한다.
 */
export const NOTICE_PUBLISH_BUCKET_MS = 5 * 60 * 1000

/**
 * 지금 내보내도 되는 공지의 상한 시각.
 * 내림이 아니라 올림이다. 내리면 방금 쓴 공지가 몇 분 동안 목록에 없어
 * 관리자가 등록에 실패한 줄 안다. 올린 대가로 예약 공지가 제 시각보다
 * 최대 이 폭만큼 일찍 뜨는데, 그쪽이 훨씬 덜 해롭다.
 */
export function currentPublishBoundary(now: number = Date.now()): string {
  const ceiled = Math.ceil(now / NOTICE_PUBLISH_BUCKET_MS) * NOTICE_PUBLISH_BUCKET_MS
  return new Date(ceiled).toISOString()
}

/**
 * 발행 시각이 아직 오지 않은 공지인가.
 * 목록을 거르는 기준과 같은 경계를 본다 — 어긋나면 이미 공개된 공지에
 * 「예약」 딱지가 붙는다.
 */
export function isScheduledNotice(createdAt: string, now: number = Date.now()): boolean {
  return new Date(createdAt).toISOString() > currentPublishBoundary(now)
}
