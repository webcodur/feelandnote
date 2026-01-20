import { createClient } from '@/lib/supabase/server'
import { Activity } from 'lucide-react'
import ActivityLogsClient from './ActivityLogsClient'

const ACTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  CONTENT_ADD: { label: '콘텐츠 등록', color: 'success' },
  CONTENT_REMOVE: { label: '콘텐츠 삭제', color: 'danger' },
  STATUS_CHANGE: { label: '상태 변경', color: 'info' },
  PROGRESS_CHANGE: { label: '진행 변경 (레거시)', color: 'default' },
  REVIEW_UPDATE: { label: '리뷰 작성', color: 'purple' },
  RECORD_CREATE: { label: '기록 작성', color: 'warning' },
  RECORD_UPDATE: { label: '기록 수정', color: 'info' },
  RECORD_DELETE: { label: '기록 삭제', color: 'danger' },
}

const TARGET_TYPE_MAP: Record<string, string> = {
  content: '콘텐츠',
  record: '기록',
}

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; search?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const actionFilter = params.action || ''
  const searchQuery = params.search || ''
  const perPage = 30

  const supabase = await createClient()

  // 쿼리 빌드
  let query = supabase
    .from('activity_logs')
    .select('*, profiles:user_id (id, nickname, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (actionFilter) {
    query = query.eq('action_type', actionFilter)
  }

  const { data: logs, count } = await query
    .range((page - 1) * perPage, page * perPage - 1)

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  // 액션 타입별 통계
  const { data: actionStats } = await supabase
    .from('activity_logs')
    .select('action_type')

  const actionCountMap = (actionStats || []).reduce((acc, item) => {
    acc[item.action_type] = (acc[item.action_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 필터 옵션 생성
  const filterOptions = [
    { value: '', label: '전체', count: total },
    ...Object.entries(ACTION_TYPE_MAP).map(([key, config]) => ({
      value: key,
      label: config.label,
      count: actionCountMap[key] || 0,
    })),
  ]

  return (
    <ActivityLogsClient
      logs={logs || []}
      total={total}
      page={page}
      totalPages={totalPages}
      actionFilter={actionFilter}
      searchQuery={searchQuery}
      filterOptions={filterOptions}
      actionTypeMap={ACTION_TYPE_MAP}
      targetTypeMap={TARGET_TYPE_MAP}
    />
  )
}
