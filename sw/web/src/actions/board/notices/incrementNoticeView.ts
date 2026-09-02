'use server'

import { createClient } from '@/lib/db/server'

/**
 * 공지 조회수 1 증가.
 *
 * 상세 화면은 `getNotice`가 본문을 가져오면서 함께 올리지만, 홈 모달처럼 이미 받아 둔 목록
 * 데이터로 본문을 펴는 자리는 조회를 다시 하지 않으므로 이 액션만 따로 부른다.
 *
 * 화면의 숫자는 목록 캐시(`getNotices`, revalidate 3600)에서 오므로 다음 재생성 전까지
 * 그대로다. 부르는 쪽에서 낙관적으로 +1 해 두면 이용자에게는 즉시 반영된 것으로 보인다.
 */
export async function incrementNoticeView(noticeId: string): Promise<void> {
  try {
    const db = await createClient()
    await db.rpc('increment_notice_view_count', { notice_id: noticeId })
  } catch (error) {
    // 조회수는 부가 정보다. 실패해도 본문 읽기를 막지 않는다
    console.error('[공지사항 조회수]', error)
  }
}
