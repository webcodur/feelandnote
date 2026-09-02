import type { SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { type ActionResult, type ActionFailure, failure } from '@/lib/errors'

type AdminRole = 'admin' | 'super_admin'

interface AdminCheckSuccess {
  success: true
  userId: string
  role: AdminRole
}

type AdminCheckResult = AdminCheckSuccess | ActionFailure

export async function checkAdmin(db: DatabaseClient): Promise<AdminCheckResult> {
  const { data: { user } } = await db.auth.getUser()

  if (!user) {
    return failure('UNAUTHORIZED')
  }

  const [{ data: isAdmin }, { data: account }] = await Promise.all([
    db.rpc('is_admin'),
    db.from('user_accounts').select('role').eq('id', user.id).single(),
  ])
  const role = account?.role as string | null

  if (!isAdmin || !role || !['admin', 'super_admin'].includes(role)) {
    return failure('FORBIDDEN', '관리자 권한이 필요하다.')
  }

  return {
    success: true,
    userId: user.id,
    role: role as AdminRole
  }
}

export async function isAdmin(db: DatabaseClient): Promise<boolean> {
  const result = await checkAdmin(db)
  return result.success === true
}
