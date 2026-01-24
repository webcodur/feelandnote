'use server'

import { createClient } from '@/lib/supabase/server'
import type { NoticeWithAuthor } from '@/types/database'

interface GetNoticesParams {
  limit?: number
  offset?: number
}

export async function getNotices(params: GetNoticesParams = {}) {
  const { limit = 20, offset = 0 } = params
  const supabase = await createClient()

  const { data, error, count } = await supabase
    .from('notices')
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url)
    `, { count: 'exact' })
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[공지사항 목록] Error:', error)
    throw new Error('공지사항을 불러오는데 실패했습니다')
  }

  return {
    notices: data as NoticeWithAuthor[],
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit
  }
}
