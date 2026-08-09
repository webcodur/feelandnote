'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { ENUM_REPORT_STATUS } from '@/constants/moderation'
import { loadReportSnapshot } from '@/lib/report-snapshot'

// 신고 처리와 조치. 처리자·처리 시각은 로그인한 관리자에서 가져온다(화면 입력값을 믿지 않는다).

// #region 공통
function refresh(reportId: string) {
  revalidatePath('/reports')
  revalidatePath(`/reports/${reportId}`)
}

async function loadReportTarget(reportId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reports')
    .select('target_type, target_id, target_user_id')
    .eq('id', reportId)
    .maybeSingle()

  if (error) throw new Error(`신고 조회 실패: ${error.message}`)
  if (!data) throw new Error('신고를 찾을 수 없다')

  return data as unknown as {
    target_type: string
    target_id: string
    target_user_id: string | null
  }
}

async function closeReport(reportId: string, status: string, note: string) {
  const trimmed = note.trim()
  if (trimmed.length === 0) throw new Error('처리 메모를 입력해달라')

  const { userId } = await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('reports')
    .update({
      status,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_note: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) throw new Error(`신고 처리 실패: ${error.message}`)
  refresh(reportId)
}
// #endregion

// #region 종결
export async function resolveReport(reportId: string, note: string): Promise<void> {
  await closeReport(reportId, ENUM_REPORT_STATUS.RESOLVED, note)
}

export async function rejectReport(reportId: string, note: string): Promise<void> {
  await closeReport(reportId, ENUM_REPORT_STATUS.REJECTED, note)
}

export async function reopenReport(reportId: string): Promise<void> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('reports')
    .update({
      status: ENUM_REPORT_STATUS.PENDING,
      resolved_by: null,
      resolved_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) throw new Error(`신고 되돌리기 실패: ${error.message}`)
  refresh(reportId)
}
// #endregion

// #region 대상 조치
type HidePayload = { is_deleted: boolean } | { is_private: boolean } | { visibility: string }

export async function setReportTargetHidden(reportId: string, hidden: boolean): Promise<void> {
  await requireAdmin()

  const target = await loadReportTarget(reportId)
  const snapshot = await loadReportSnapshot(target.target_type, target.target_id)

  if (!snapshot.found || !snapshot.table) throw new Error('대상 원문이 없어 숨길 수 없다')
  if (snapshot.hideMode === 'none') {
    throw new Error('이 대상에는 숨김 수단이 없다. 삭제로만 처리할 수 있다')
  }

  // 되돌릴 때 원래 공개 범위(팔로워 공개 등)는 알 수 없으므로 전체 공개로 돌린다.
  const payload: HidePayload =
    snapshot.hideMode === 'is_deleted'
      ? { is_deleted: hidden }
      : snapshot.hideMode === 'is_private'
        ? { is_private: hidden }
        : { visibility: hidden ? 'private' : 'public' }

  const supabase = createAdminClient()
  const { error } = await supabase.from(snapshot.table).update(payload).eq('id', target.target_id)

  if (error) throw new Error(`대상 숨김 처리 실패: ${error.message}`)
  refresh(reportId)
}

export async function deleteReportTarget(reportId: string): Promise<void> {
  await requireAdmin()

  const target = await loadReportTarget(reportId)
  const snapshot = await loadReportSnapshot(target.target_type, target.target_id)

  if (!snapshot.found || !snapshot.table) throw new Error('대상 원문이 없어 삭제할 수 없다')
  if (!snapshot.deletable) {
    throw new Error(snapshot.deleteBlockedReason ?? '이 대상은 이 화면에서 삭제할 수 없다')
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from(snapshot.table).delete().eq('id', target.target_id)

  if (error) throw new Error(`대상 삭제 실패: ${error.message}`)
  refresh(reportId)
}
// #endregion

// #region 계정 제재
export async function suspendReportedUser(
  reportId: string,
  userId: string,
  reason: string
): Promise<void> {
  await requireAdmin()

  const trimmed = reason.trim()
  if (trimmed.length === 0) throw new Error('정지 사유를 입력해달라')

  const supabase = createAdminClient()
  // 계정 정지는 계정 기록에 적는다. celebs.publication_status는 인물 공개 상태라 다른 축이다.
  const { error } = await supabase
    .from('user_accounts')
    .update({
      account_status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: trimmed,
    })
    .eq('id', userId)

  if (error) throw new Error(`계정 정지 실패: ${error.message}`)

  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  refresh(reportId)
}

export async function unsuspendReportedUser(reportId: string, userId: string): Promise<void> {
  await requireAdmin()

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('user_accounts')
    .update({ account_status: 'active', suspended_at: null, suspended_reason: null })
    .eq('id', userId)

  if (error) throw new Error(`정지 해제 실패: ${error.message}`)

  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  refresh(reportId)
}
// #endregion
