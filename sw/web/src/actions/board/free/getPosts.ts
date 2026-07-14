'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { FREE_POST_COLS, FREE_AUTHOR_JOIN } from '@/lib/board/freeBoard'
import type { FreePost } from '@/types/database'

interface GetFreePostsParams {
  limit?: number
  offset?: number
}

export async function getFreePosts(params: GetFreePostsParams = {}) {
  const { limit = 20, offset = 0 } = params
  const supabase = createAdminClient()

  const { data, error, count } = await supabase
    .from('free_posts')
    .select(`${FREE_POST_COLS}, ${FREE_AUTHOR_JOIN}`, { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[자유게시판 목록] Error:', error)
    throw new Error('자유게시판 목록을 불러오지 못했습니다')
  }

  const posts = (data ?? []) as unknown as FreePost[]

  // 각 글의 댓글 수 부착
  if (posts.length > 0) {
    const ids = posts.map((p) => p.id)
    const { data: counts } = await supabase
      .from('free_post_comments')
      .select('post_id')
      .eq('is_deleted', false)
      .in('post_id', ids)

    if (counts) {
      const map = (counts as { post_id: string }[]).reduce<Record<string, number>>((acc, c) => {
        acc[c.post_id] = (acc[c.post_id] || 0) + 1
        return acc
      }, {})
      posts.forEach((p) => {
        p.comment_count = map[p.id] || 0
      })
    }
  }

  return {
    posts,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  }
}
