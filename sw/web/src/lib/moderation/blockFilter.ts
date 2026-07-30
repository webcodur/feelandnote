// 차단 필터 — 목록 조회 결과에서 차단한 사용자의 행을 걷어낸다.
//
// ⚠️ 단방향만 구현한다. "내가 차단한 사람"은 숨기지만 "나를 차단한 사람"은 숨기지 못한다.
// public.blocks 의 RLS 가 blocker_id = auth.uid() 행만 select 를 허용하므로,
// 일반(anon/authenticated) 클라이언트로는 나를 차단한 행을 아예 읽을 수 없다.
// 양방향 숨김이 필요하면 SECURITY DEFINER RPC 신설 또는 blocked_id = auth.uid() 를
// 허용하는 RLS 정책 추가가 선행돼야 한다. 그 전에는 양방향인 척하지 않는다.
//
// ⚠️ 여기서 얻은 id 배열을 그대로 `.in()`에 싣지 마라.
// PostgREST 는 URL 길이 한도가 있어 UUID 다수를 한 번에 넣으면 요청 자체가 실패한다
// (이 저장소 실측: 300개 성공 / 462개 실패). 200개를 넘길 가능성이 있으면
// `@feelandnote/shared/lib/paginate` 의 selectInChunks 로 나눠 조회한다.
// 차단 목록은 통상 수십 건이라 실무상 문제되지 않지만, 상한은 200개로 본다.

import { createClient } from '@/lib/supabase/server'

// #region 차단 대상 id 조회
// 현재 로그인 사용자가 차단한 사용자 id 배열. 비로그인이면 빈 배열.
// 조회 실패는 조용히 빈 배열로 대체하지 않고 throw 한다 —
// 빈 배열을 돌려주면 차단이 풀린 화면을 정상처럼 보여주게 된다.
export async function getBlockedUserIds(): Promise<string[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id)

  if (error) {
    console.error('[차단 목록 조회] Error:', error)
    throw new Error(`차단 목록을 읽지 못했다: ${error.message}`)
  }

  return (data ?? []).map((row) => row.blocked_id)
}
// #endregion

// #region 목록 필터
// 순수 함수. 행에서 작성자 id 를 꺼내는 방법만 넘기면 차단 대상 행을 제거한다.
// 작성자 id 가 없는 행(익명 글 등)은 남긴다.
export function filterBlocked<T>(
  rows: readonly T[],
  getUserId: (row: T) => string | null | undefined,
  blockedIds: readonly string[]
): T[] {
  if (blockedIds.length === 0) return [...rows]

  const blocked = new Set(blockedIds)

  return rows.filter((row) => {
    const userId = getUserId(row)
    if (!userId) return true
    return !blocked.has(userId)
  })
}
// #endregion

// #region 단건 판정
// 특정 사용자가 차단 목록에 있는지. 상세 화면에서 접근 차단 여부를 가릴 때 쓴다.
export function isBlocked(userId: string | null | undefined, blockedIds: readonly string[]): boolean {
  if (!userId) return false
  return blockedIds.includes(userId)
}
// #endregion
