import { createClient } from '@/lib/supabase/server'
import { Activity } from 'lucide-react'
import ActivityLogsClient from './ActivityLogsClient'

const ACTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  content_add: { label: '콘텐츠 등록', color: 'success' },
  content_update: { label: '콘텐츠 수정', color: 'info' },
  content_delete: { label: '콘텐츠 삭제', color: 'danger' },
  record_add: { label: '기록 작성', color: 'purple' },
  record_update: { label: '기록 수정', color: 'info' },
  follow: { label: '팔로우', color: 'pink' },
  unfollow: { label: '언팔로우', color: 'default' },
  login: { label: '로그인', color: 'cyan' },
  note_add: { label: '노트 작성', color: 'warning' },
  note_update: { label: '노트 수정', color: 'warning' },
  playlist_add: { label: '플레이리스트 생성', color: 'orange' },
  guestbook_add: { label: '방명록 작성', color: 'purple' },
}

const TARGET_TYPE_MAP: Record<string, string> = {
  user_content: '콘텐츠',
  record: '기록',
  user: '사용자',
  note: '노트',
  playlist: '플레이리스트',
  guestbook: '방명록',
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
