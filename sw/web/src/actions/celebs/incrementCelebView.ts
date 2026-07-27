'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * 인물 화면 조회 1회를 반영하고 갱신된 누적 조회수를 돌려준다.
 *
 * 화면 데이터는 최대 7일 캐시를 타므로 조회수만 따로 받아 갱신한다.
 * 반환값을 쓰면 별도 조회가 필요 없다.
 *
 * @param count false면 세지 않고 현재 값만 돌려준다(같은 사람의 4시간 내 재방문).
 */
export async function incrementCelebView(
  celebId: string,
  count: boolean = true,
): Promise<number | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('increment_celeb_view', {
    p_celeb_id: celebId,
    p_increment: count,
  })

  if (error) {
    console.error('[인물 조회수] 반영 실패:', error.message)
    return null
  }

  return typeof data === 'number' ? data : null
}
