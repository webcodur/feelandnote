'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { loadReportSnapshot, type ReportTargetSnapshot } from '@/lib/report-snapshot'

// 신고 한 건의 상세. 대상 원문 스냅샷을 함께 싣는다.

// #region 타입
export interface ReportPersonDetail {
  id: string
  nickname: string | null
  email: string | null
  avatarUrl: string | null
  status: string | null
  suspendedAt: string | null
  suspendedReason: string | null
  profileType: string | null
}

export interface ReportDetail {
  id: string
  reporterId: string
  targetType: string
  targetId: string
  targetUserId: string | null
  reason: string
  description: string | null
  status: string
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
  reporter: ReportPersonDetail | null
  targetUser: ReportPersonDetail | null
  resolverNickname: string | null
  snapshot: ReportTargetSnapshot
}

interface RawPerson {
  id: string
  nickname: string | null
  email: string | null
  avatar_url: string | null
  status: string | null
  suspended_at: string | null
  suspended_reason: string | null
  profile_type: string | null
}

interface RawReport {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  target_user_id: string | null
  reason: string
  description: string | null
  status: string
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  reporter: RawPerson | null
  targetUser: RawPerson | null
  resolver: { nickname: string | null } | null
}
// #endregion

const PERSON_COLUMNS =
  '(id, nickname, email, avatar_url, status, suspended_at, suspended_reason, profile_type)'

const DETAIL_SELECT = `
  id, reporter_id, target_type, target_id, target_user_id, reason, description,
  status, resolved_at, resolution_note, created_at,
  reporter:reporter_id ${PERSON_COLUMNS},
  targetUser:target_user_id ${PERSON_COLUMNS},
  resolver:resolved_by (nickname)
`

function toPerson(raw: RawPerson | null): ReportPersonDetail | null {
  if (!raw) return null
  return {
    id: raw.id,
    nickname: raw.nickname,
    email: raw.email,
    avatarUrl: raw.avatar_url,
    status: raw.status,
    suspendedAt: raw.suspended_at,
    suspendedReason: raw.suspended_reason,
    profileType: raw.profile_type,
  }
}

export async function getReportDetail(reportId: string): Promise<ReportDetail | null> {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reports')
    .select(DETAIL_SELECT)
    .eq('id', reportId)
    .maybeSingle()

  if (error || !data) return null

  const raw = data as unknown as RawReport
  const snapshot = await loadReportSnapshot(raw.target_type, raw.target_id)

  return {
    id: raw.id,
    reporterId: raw.reporter_id,
    targetType: raw.target_type,
    targetId: raw.target_id,
    targetUserId: raw.target_user_id,
    reason: raw.reason,
    description: raw.description,
    status: raw.status,
    resolvedAt: raw.resolved_at,
    resolutionNote: raw.resolution_note,
    createdAt: raw.created_at,
    reporter: toPerson(raw.reporter),
    targetUser: toPerson(raw.targetUser),
    resolverNickname: raw.resolver?.nickname ?? null,
    snapshot,
  }
}
