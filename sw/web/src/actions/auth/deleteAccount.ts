'use server'

import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { type ActionResult, failure } from '@/lib/errors'

// #region 삭제 방식
// delete_my_account RPC는 인자를 받지 않고 현재 로그인한 회원만 지운다.
// user_accounts가 지워지면 member_profiles·member_contents·회원 관계가 CASCADE로 정리된다.
// 일반 회원 요청에서 service role 키나 삭제할 UUID를 전달하지 않는다.
// #endregion

export async function deleteAccount(): Promise<ActionResult<null>> {
  const db = await createClient()

  // 현재 로그인한 사용자 확인
  const { data: { user }, error: userError } = await db.auth.getUser()

  if (userError || !user) {
    return failure('UNAUTHORIZED')
  }

  const { error: deleteError } = await db.rpc('delete_my_account')

  if (deleteError) {
    console.error('[회원탈퇴] 계정 삭제 실패:', deleteError)
    return failure('DB_ERROR', '회원탈퇴에 실패했다. 잠시 후 다시 시도해달라.')
  }

  // 현재 세션 로그아웃
  await db.auth.signOut()

  redirect('/login')
}
