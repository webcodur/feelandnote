'use server'

import { createClient } from '@/lib/supabase/server'

export interface ReviewFeedItem {
  id: string
  rating: number | null
  review: string
  is_spoiler: boolean
  updated_at: string
  user: {
    id: string
    nickname: string
    avatar_url: string | null
  }
}

interface GetReviewFeedParams {
  contentId: string
  limit?: number
  offset?: number
  excludeUserId?: string
}

export async function getReviewFeed(params: GetReviewFeedParams): Promise<ReviewFeedItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('user_contents')
    .select(`
      id,
      rating,
      review,
      is_spoiler,
      updated_at,
      user:profiles!user_contents_user_id_fkey(id, nickname, avatar_url)
    `)
    .eq('content_id', params.contentId)
    .not('review', 'is', null)
    .order('updated_at', { ascending: false })

  // 본인 리뷰는 항상 제외
  if (user) {
    query = query.neq('user_id', user.id)
  }

  // 특정 사용자 리뷰 제외 (타인 프로필 조회 시 해당 사용자 리뷰 제외)
  if (params.excludeUserId) {
    query = query.neq('user_id', params.excludeUserId)
  }

  if (params.limit) {
    query = query.limit(params.limit)
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Get review feed error:', error)
    return []
  }

  return (data || []).map(record => ({
    ...record,
    review: record.review as string,
    user: Array.isArray(record.user) ? record.user[0] : record.user
  })) as ReviewFeedItem[]
}
