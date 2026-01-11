'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type ActionResult, failure } from '@/lib/errors'

// #region 삭제 순서 주의사항
// profiles.id와 auth.users.id가 외래키로 연결되어 있지 않음 (셀럽 프로필 때문)
// 따라서 반드시 아래 순서를 지켜야 함:
// 1. profiles 삭제 → CASCADE로 user_contents, records, playlists, follows 등 삭제
// 2. auth.users 삭제 → CASCADE로 saved_playlists, categories 삭제
// 순서를 바꾸면 profiles 및 연결 데이터가 고아 데이터로 남게 됨
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

  // 1. profiles 삭제 (CASCADE로 연결된 모든 데이터 자동 삭제)
  // profiles → user_contents, records, playlists, follows, etc. 모두 CASCADE
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', user.id)

  if (profileError) {
    console.error('[회원탈퇴] 프로필 삭제 실패:', profileError)
    return failure('DB_ERROR', '회원탈퇴에 실패했다. 잠시 후 다시 시도해달라.')
  }

  // 2. auth.users 삭제
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

  if (deleteError) {
    console.error('[회원탈퇴] auth 사용자 삭제 실패:', deleteError)
    // profiles는 이미 삭제됨, auth만 남은 상태 (큰 문제는 아님)
  }

  // 현재 세션 로그아웃
  await supabase.auth.signOut()

  redirect('/login')
}
