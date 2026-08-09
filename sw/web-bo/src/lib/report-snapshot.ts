import { createAdminClient } from '@/lib/supabase/admin'
import { isReportTargetType } from '@/constants/moderation'
import {
  REPORT_TARGET_SPECS,
  matchesIdType,
  readTargetAuthor,
  readTargetHidden,
  readTargetText,
  type ReportTargetSpec,
  type TargetHideMode,
  type TargetRow,
} from './report-targets'

// 신고 대상 원문 스냅샷 조회.
// 원문이 없거나 조회가 실패하면 빈 화면을 주지 않고 사유를 들고 돌아온다.

export interface ReportTargetSnapshot {
  found: boolean
  table: string | null
  tableLabel: string | null
  title: string | null
  body: string | null
  authorId: string | null
  authorNickname: string | null
  createdAt: string | null
  hidden: boolean
  hideMode: TargetHideMode
  hideLabel: string | null
  restoreLabel: string | null
  deletable: boolean
  deleteBlockedReason: string | null
  adminHref: string | null
  // 못 찾았을 때 어디를 뒤졌는지 드러낸다.
  searchedTables: readonly string[]
  // 조회 자체가 실패했을 때의 사유. null 이면 "찾아봤지만 없다"는 뜻이다.
  lookupError: string | null
}

const EMPTY_SNAPSHOT: ReportTargetSnapshot = {
  found: false,
  table: null,
  tableLabel: null,
  title: null,
  body: null,
  authorId: null,
  authorNickname: null,
  createdAt: null,
  hidden: false,
  hideMode: 'none',
  hideLabel: null,
  restoreLabel: null,
  deletable: false,
  deleteBlockedReason: null,
  adminHref: null,
  searchedTables: [],
  lookupError: null,
}

function buildSnapshot(
  spec: ReportTargetSpec,
  row: TargetRow,
  targetId: string,
  searchedTables: readonly string[]
): ReportTargetSnapshot {
  return {
    found: true,
    table: spec.table,
    tableLabel: spec.tableLabel,
    title: readTargetText(row, spec.titleKey),
    body: readTargetText(row, spec.bodyKey),
    authorId: readTargetAuthor(row, spec.authorKey),
    authorNickname: null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    hidden: readTargetHidden(row, spec.hideMode),
    hideMode: spec.hideMode,
    hideLabel: spec.hideLabel,
    restoreLabel: spec.restoreLabel,
    deletable: spec.deletable,
    deleteBlockedReason: spec.deleteBlockedReason ?? null,
    adminHref: spec.adminHref ? spec.adminHref(targetId) : null,
    searchedTables,
    lookupError: null,
  }
}

export async function loadReportSnapshot(
  targetType: string,
  targetId: string
): Promise<ReportTargetSnapshot> {
  if (!isReportTargetType(targetType)) {
    return { ...EMPTY_SNAPSHOT, lookupError: `등록되지 않은 신고 대상 종류다: ${targetType}` }
  }

  const specs = REPORT_TARGET_SPECS[targetType]
  const usable = specs.filter((spec) => matchesIdType(spec, targetId))
  const searchedTables = usable.map((spec) => spec.tableLabel)

  if (usable.length === 0) {
    return {
      ...EMPTY_SNAPSHOT,
      searchedTables: specs.map((spec) => spec.tableLabel),
      lookupError: '신고에 적힌 대상 번호의 형식이 저장소와 맞지 않아 원문을 찾을 수 없다.',
    }
  }

  const supabase = createAdminClient()
  const failures: string[] = []

  for (const spec of usable) {
    const { data, error } = await supabase
      .from(spec.table)
      .select(spec.selectColumns)
      .eq('id', targetId)
      .maybeSingle()

    if (error) {
      failures.push(`${spec.tableLabel}: ${error.message}`)
      continue
    }
    if (!data) continue

    const snapshot = buildSnapshot(spec, data as TargetRow, targetId, searchedTables)
    if (!snapshot.authorId) return snapshot

    const { data: author, error: authorError } = await supabase
      .from('member_profiles')
      .select('nickname')
      .eq('id', snapshot.authorId)
      .maybeSingle()

    if (authorError) {
      return { ...snapshot, lookupError: `작성자 조회 실패: ${authorError.message}` }
    }

    const nickname = (author as { nickname?: string | null } | null)?.nickname
    return { ...snapshot, authorNickname: typeof nickname === 'string' ? nickname : null }
  }

  return {
    ...EMPTY_SNAPSHOT,
    searchedTables,
    lookupError: failures.length > 0 ? failures.join(' / ') : null,
  }
}
