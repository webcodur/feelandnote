'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActivityLogWithContent } from '@/types/database'

interface GetActivityLogsParams {
  limit?: number
  cursor?: string  // created_at ISO string
}

interface GetActivityLogsResult {
  logs: ActivityLogWithContent[]
  nextCursor: string | null
}

export async function getActivityLogs(
  params: GetActivityLogsParams = {}
): Promise<GetActivityLogsResult> {
  const { limit = 20, cursor } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { logs: [], nextCursor: null }

  let query = supabase
    .from('activity_logs')
    .select(`
      id,
      user_id,
      action_type,
      target_type,
      target_id,
      content_id,
      metadata,
      created_at,
      content:contents!content_id(id, title, thumbnail_url, type)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error || !data) return { logs: [], nextCursor: null }

  const hasMore = data.length > limit
  const sliced = hasMore ? data.slice(0, limit) : data

  // Supabase join 결과가 배열로 반환되므로 첫 번째 요소 추출
  const logs: ActivityLogWithContent[] = sliced.map((item) => ({
    ...item,
    content: Array.isArray(item.content) ? item.content[0] ?? null : item.content,
  }))

  return {
    logs,
    nextCursor: hasMore ? logs[logs.length - 1].created_at : null
  }
}
