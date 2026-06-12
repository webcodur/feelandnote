'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { FeedbackWithAuthor, FeedbackCategory, FeedbackStatus } from '@/types/database'

interface GetFeedbacksParams {
  category?: FeedbackCategory
  status?: FeedbackStatus
  limit?: number
  offset?: number
}

async function fetchFeedbacks(
  category: FeedbackCategory | null,
  status: FeedbackStatus | null,
  limit: number,
  offset: number,
) {
  const supabase = createStaticClient()

  let query = supabase
    .from('feedbacks')
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url)
    `, { count: 'exact' })

  if (category) {
    query = query.eq('category', category)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[피드백 목록] Error:', error)
    throw new Error('피드백을 불러오는데 실패했습니다')
  }

  const feedbacks = data as FeedbackWithAuthor[]

  if (feedbacks.length > 0) {
    const ids = feedbacks.map(f => f.id)
    const { data: counts } = await supabase
      .from('board_comments')
      .select('post_id')
      .eq('board_type', 'FEEDBACK')
      .in('post_id', ids)

    if (counts) {
      const countMap = counts.reduce<Record<string, number>>((acc, c) => {
        acc[c.post_id] = (acc[c.post_id] || 0) + 1
        return acc
      }, {})
      feedbacks.forEach(f => { f.comment_count = countMap[f.id] || 0 })
    }
  }

  return {
    feedbacks,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit
  }
}

const getFeedbacksCached = unstable_cache(
  fetchFeedbacks,
  ['feedbacks'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getFeedbacks(params: GetFeedbacksParams = {}) {
  const { category, status, limit = 20, offset = 0 } = params
  return getFeedbacksCached(category ?? null, status ?? null, limit, offset)
}
