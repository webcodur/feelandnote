import { createClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'

export type AdminRole = 'admin' | 'super_admin'

interface AdminIdentity {
  userId: string
  role: AdminRole
}

interface ManagedAccount {
  id: string
  role: string
  account_status: string
}

/** service-role 작업 전에 반드시 거치는 활성 관리자 확인 — 서버 액션 공용. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const db = await createClient()
  const { data: claimsData, error: claimsError } = await db.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) throw new Error('로그인이 필요합니다')

  const [{ data: isAdmin, error }, { data: account, error: accountError }] = await Promise.all([
    db.rpc('is_admin'),
    db.from('user_accounts').select('role').eq('id', userId).maybeSingle(),
  ])

  if (
    error
    || accountError
    || !isAdmin
    || !account
    || !['admin', 'super_admin'].includes(account.role ?? '')
  ) {
    throw new Error('관리자 권한이 필요합니다')
  }

  return { userId, role: account.role as AdminRole }
}

export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const admin = await requireAdmin()
  if (admin.role !== 'super_admin') throw new Error('최고 관리자 권한이 필요합니다')
  return admin
}

export async function requireAccountManager(targetUserId: string): Promise<{
  admin: AdminIdentity
  target: ManagedAccount
}> {
  const admin = await requireAdmin()
  if (admin.userId === targetUserId) throw new Error('자기 계정에는 이 작업을 할 수 없습니다.')

  const db = createAdminClient()
  const { data: target, error } = await db
    .from('user_accounts')
    .select('id, role, account_status')
    .eq('id', targetUserId)
    .maybeSingle()

  if (error) throw error
  if (!target) throw new Error('대상 회원을 찾을 수 없습니다.')
  if (target.role !== 'user' && admin.role !== 'super_admin') {
    throw new Error('관리자 계정은 최고 관리자만 변경할 수 있습니다.')
  }

  if (target.role === 'super_admin' && target.account_status === 'active') {
    const { count, error: countError } = await db
      .from('user_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('account_status', 'active')

    if (countError) throw countError
    if ((count ?? 0) <= 1) throw new Error('마지막 활성 최고 관리자는 변경할 수 없습니다.')
  }

  return { admin, target }
}
