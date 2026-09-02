'use server'

import { createAdminClient } from '@/lib/db/admin'
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

interface RawAccount {
  id: string
  email: string | null
  account_status: string | null
  suspended_at: string | null
  suspended_reason: string | null
  member_profiles: RawPerson | RawPerson[] | null
}

interface RawPerson {
  nickname: string | null
  avatar_url: string | null
  // 계정 값은 26.08.07에 user_accounts로 갈라졌다. 인물에게는 이 행이 없다.
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
  reporter: RawAccount | null
  targetUser: RawAccount | null
  resolver: RawAccount | null
}
// #endregion

const PERSON_COLUMNS =
  '(id, email, account_status, suspended_at, suspended_reason, member_profiles!member_profiles_id_fkey(nickname, avatar_url))'

const DETAIL_SELECT = `
  id, reporter_id, target_type, target_id, target_user_id, reason, description,
  status, resolved_at, resolution_note, created_at,
  reporter:user_accounts!reports_reporter_accounts_fkey ${PERSON_COLUMNS},
  targetUser:user_accounts!reports_target_accounts_fkey ${PERSON_COLUMNS},
  resolver:user_accounts!reports_resolver_accounts_fkey ${PERSON_COLUMNS}
`

function toPerson(raw: RawAccount | null): ReportPersonDetail | null {
  if (!raw) return null
  const profile = Array.isArray(raw.member_profiles) ? raw.member_profiles[0] ?? null : raw.member_profiles
  return {
    id: raw.id,
    nickname: profile?.nickname ?? null,
    email: raw.email,
    avatarUrl: profile?.avatar_url ?? null,
    status: raw.account_status,
    suspendedAt: raw.suspended_at,
    suspendedReason: raw.suspended_reason,
  }
}

export async function getReportDetail(reportId: string): Promise<ReportDetail | null> {
  await requireAdmin()

  const db = createAdminClient()
  const { data, error } = await db
    .from('reports')
    .select(DETAIL_SELECT)
    .eq('id', reportId)
    .maybeSingle()

  if (error) throw new Error(`신고 상세 조회 실패: ${error.message}`)
  if (!data) return null

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
    resolverNickname: raw.resolver
      ? (Array.isArray(raw.resolver.member_profiles)
          ? raw.resolver.member_profiles[0]?.nickname
          : raw.resolver.member_profiles?.nickname) ?? null
      : null,
    snapshot,
  }
}
