import { createClient } from '@/lib/supabase/server'

/** service-role 작업 전에 반드시 거치는 관리자 확인 — 서버 액션 공용. */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) {
    throw new Error('관리자 권한이 필요합니다')
  }

  return { userId: user.id }
}

