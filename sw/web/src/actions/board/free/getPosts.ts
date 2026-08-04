'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { FREE_POST_COLS, FREE_AUTHOR_JOIN } from '@/lib/board/freeBoard'
import { getBlockedUserIds, filterBlocked } from '@/lib/moderation/blockFilter'
import type { FreePost } from '@/types/database'
import type { Locale } from '@/types/locale'

interface GetFreePostsParams {
  locale: Locale
  limit?: number
  offset?: number
}

export async function getFreePosts(params: GetFreePostsParams) {
  const { locale, limit = 20, offset = 0 } = params
  const supabase = createAdminClient()

  const { data, error, count } = await supabase
    .from('free_posts')
    .select(`${FREE_POST_COLS}, ${FREE_AUTHOR_JOIN}`, { count: 'exact' })
    .eq('is_deleted', false)
    .eq('locale', locale)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[자유게시판 목록] Error:', error)
    throw new Error('자유게시판 목록을 불러오지 못했습니다')
  }

  const allPosts = (data ?? []) as unknown as FreePost[]

  // 차단한 사용자의 글을 걷어낸다. 이 조회는 캐시하지 않으므로 요청마다 보는 사람 기준으로 걸러진다.
  // total 은 걸러낸 만큼만 줄인다 — 뒷 페이지의 차단 글은 여기서 알 수 없어 정확한 값이 아니다.
  const blockedIds = await getBlockedUserIds()
  const posts = filterBlocked(allPosts, (post) => post.author_id, blockedIds)
  const removed = allPosts.length - posts.length

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

  const total = Math.max((count ?? 0) - removed, posts.length)

  return {
    posts,
    total,
    hasMore: (count ?? 0) > offset + limit,
  }
}
