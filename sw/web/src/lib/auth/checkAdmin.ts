import type { SupabaseClient } from '@supabase/supabase-js'
import { type ActionResult, type ActionFailure, failure } from '@/lib/errors'

type AdminRole = 'admin' | 'super_admin'

interface AdminCheckSuccess {
  success: true
  userId: string
  role: AdminRole
}

type AdminCheckResult = AdminCheckSuccess | ActionFailure

export async function checkAdmin(supabase: SupabaseClient): Promise<AdminCheckResult> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return failure('UNAUTHORIZED')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  if (!role || !['admin', 'super_admin'].includes(role)) {
    return failure('FORBIDDEN', '관리자 권한이 필요하다.')
  }

  return {
    success: true,
    userId: user.id,
    role: role as AdminRole
  }
}

export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const result = await checkAdmin(supabase)
  return result.success === true
}
