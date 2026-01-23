import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'API 사용량',
}
import ApiUsageClient from './ApiUsageClient'

const ACTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  search_books: { label: '도서 검색', color: 'text-blue-400' },
  search_videos: { label: '영상 검색', color: 'text-red-400' },
  search_games: { label: '게임 검색', color: 'text-green-400' },
  search_music: { label: '음악 검색', color: 'text-purple-400' },
  ai_generate: { label: 'AI 생성', color: 'text-yellow-400' },
  ai_analyze: { label: 'AI 분석', color: 'text-orange-400' },
  ai_recommend: { label: 'AI 추천', color: 'text-pink-400' },
}

export default async function ApiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; key?: string; success?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const keyFilter = params.key || ''
  const successFilter = params.success || ''
  const perPage = 50

  const supabase = await createClient()

  // API 키 목록
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, title')
    .order('title')

  // 사용 로그 조회
  let query = supabase
    .from('api_key_usage')
    .select('*, api_key:api_key_id (id, title)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (keyFilter) query = query.eq('api_key_id', keyFilter)
  if (successFilter === 'true') query = query.eq('success', true)
  else if (successFilter === 'false') query = query.eq('success', false)

  const { data: usageLogs, count } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1
  )

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  // 통계
  const { count: totalUsage } = await supabase
    .from('api_key_usage')
    .select('*', { count: 'exact', head: true })

  const { count: successCount } = await supabase
    .from('api_key_usage')
    .select('*', { count: 'exact', head: true })
    .eq('success', true)

  const { count: failCount } = await supabase
    .from('api_key_usage')
    .select('*', { count: 'exact', head: true })
    .eq('success', false)

  const successRate = totalUsage && totalUsage > 0
    ? Math.round(((successCount || 0) / totalUsage) * 100)
    : 0

  // 액션 타입별 통계
  const { data: actionStatsData } = await supabase.from('api_key_usage').select('action_type')
  const actionCountMap = (actionStatsData || []).reduce((acc, item) => {
    acc[item.action_type] = (acc[item.action_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // API 키별 통계
  const { data: keyStatsData } = await supabase.from('api_key_usage').select('api_key_id')
  const keyCountMap = (keyStatsData || []).reduce((acc, item) => {
    if (item.api_key_id) acc[item.api_key_id] = (acc[item.api_key_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const keyStats = (apiKeys || []).map((key) => ({
    id: key.id,
    title: key.title,
    count: keyCountMap[key.id] || 0,
    percentage: totalUsage ? Math.round(((keyCountMap[key.id] || 0) / totalUsage) * 100) : 0,
  }))

  const actionStats = Object.entries(ACTION_TYPE_MAP).map(([key, config]) => ({
    key,
    label: config.label,
    color: config.color,
    count: actionCountMap[key] || 0,
    percentage: totalUsage ? Math.round(((actionCountMap[key] || 0) / totalUsage) * 100) : 0,
  }))

  const keyFilterOptions = [
    { value: '', label: '전체 키' },
    ...(apiKeys || []).map((key) => ({
      value: key.id,
      label: key.title,
      count: keyCountMap[key.id] || 0,
    })),
  ]

  const successFilterOptions = [
    { value: '', label: '전체' },
    { value: 'true', label: '성공', count: successCount || 0 },
    { value: 'false', label: '실패', count: failCount || 0 },
  ]

  return (
    <ApiUsageClient
      usageLogs={usageLogs || []}
      apiKeys={apiKeys || []}
      total={total}
      page={page}
      totalPages={totalPages}
      keyFilter={keyFilter}
      successFilter={successFilter}
      stats={{
        totalUsage: totalUsage || 0,
        successCount: successCount || 0,
        failCount: failCount || 0,
        successRate,
      }}
      keyStats={keyStats}
      actionStats={actionStats}
      keyFilterOptions={keyFilterOptions}
      successFilterOptions={successFilterOptions}
    />
  )
}
