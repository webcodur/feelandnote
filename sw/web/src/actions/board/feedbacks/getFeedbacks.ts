'use server'

import { createClient } from '@/lib/supabase/server'
import type { FeedbackWithAuthor, FeedbackCategory, FeedbackStatus } from '@/types/database'

interface GetFeedbacksParams {
  category?: FeedbackCategory
  status?: FeedbackStatus
  limit?: number
  offset?: number
}

export async function getFeedbacks(params: GetFeedbacksParams = {}) {
  const { category, status, limit = 20, offset = 0 } = params
  const supabase = await createClient()

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

  return {
    feedbacks: data as FeedbackWithAuthor[],
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit
  }
}
