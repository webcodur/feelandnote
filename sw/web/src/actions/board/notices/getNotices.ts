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

  const notices = data as NoticeWithAuthor[]

  // 댓글 수 조회
  if (notices.length > 0) {
    const ids = notices.map(n => n.id)
    const { data: counts } = await supabase
      .from('board_comments')
      .select('post_id')
      .eq('board_type', 'NOTICE')
      .in('post_id', ids)

    if (counts) {
      const countMap = counts.reduce<Record<string, number>>((acc, c) => {
        acc[c.post_id] = (acc[c.post_id] || 0) + 1
        return acc
      }, {})
      notices.forEach(n => { (n as any).comment_count = countMap[n.id] || 0 })
    }
  }

  return {
    notices,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit
  }
}
