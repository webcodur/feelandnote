'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type ActionResult, failure } from '@/lib/errors'

// #region 삭제 방식
// delete_auth_user RPC가 profiles와 auth.users를 한 트랜잭션에서 지운다.
// profiles가 지워지면 user_contents·records·follows 등 자식 행은 각자의 CASCADE로 정리된다.
// 클라이언트에서 두 번에 나눠 지우면 뒤 단계가 실패했을 때 로그인은 되는데
// 프로필이 없는 계정이 남는다(26.08.07 그렇게 생긴 고아 계정 18건을 정리했다).
// auth.admin.deleteUser는 confirmation_token NULL 버그로 실패할 수 있어 쓰지 않는다.
// #endregion

export async function deleteAccount(): Promise<ActionResult<null>> {
  const supabase = await createClient()

  // 현재 로그인한 사용자 확인
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return failure('UNAUTHORIZED')
  }

  // Service Role 키로 Admin 클라이언트 생성
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // auth.users 삭제 → CASCADE로 profiles 및 연결 데이터 전부 정리
  const { error: deleteError } = await supabaseAdmin.rpc('delete_auth_user', {
    target_user_id: user.id,
  })

  if (deleteError) {
    console.error('[회원탈퇴] 계정 삭제 실패:', deleteError)
    return failure('DB_ERROR', '회원탈퇴에 실패했다. 잠시 후 다시 시도해달라.')
  }

  // 현재 세션 로그아웃
  await supabase.auth.signOut()

  redirect('/login')
}
