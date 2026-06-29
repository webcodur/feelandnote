'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'

export interface ReviewFeedItem {
  id: string
  rating: number | null
  review: string
  review_en: string | null
  is_spoiler: boolean
  updated_at: string
  source_url: string | null
  user: {
    id: string
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    profile_type: 'USER' | 'CELEB'
  }
}

interface GetReviewFeedParams {
  contentId: string
  limit?: number
  offset?: number
  excludeUserId?: string
}

// select 문자열과 동일한 조회 행 (profiles 조인은 단건이지만 방어적으로 배열 허용)
interface ReviewFeedRow {
  id: string
  rating: number | null
  review: string | null
  review_en: string | null
  is_spoiler: boolean
  updated_at: string
  source_url: string | null
  user_id: string
  user: ReviewFeedItem['user'] | ReviewFeedItem['user'][]
}

async function fetchReviewFeed(
  contentId: string,
  limit: number,
  offset: number,
  excludeUserId: string | null,
  currentUserId: string | null,
): Promise<ReviewFeedItem[]> {
  const supabase = createStaticClient()

  let query = supabase
    .from('user_contents')
    .select(`
      id,
      rating,
      review,
      review_en,
      is_spoiler,
      updated_at,
      source_url,
      user_id,
      user:profiles!user_contents_user_id_fkey(id, nickname, nickname_en, avatar_url, profile_type)
    `)
    .eq('content_id', contentId)
    .eq('visibility', 'public')
    .not('review', 'is', null)
    .order('updated_at', { ascending: false })

  if (currentUserId) {
    query = query.neq('user_id', currentUserId)
  }

  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId)
  }

  if (limit) {
    query = query.limit(limit)
  }

  if (offset) {
    query = query.range(offset, offset + (limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Get review feed error:', error)
    return []
  }

  return ((data || []) as ReviewFeedRow[]).map((record): ReviewFeedItem => ({
    id: record.id,
    rating: record.rating,
    review: record.review as string,
    review_en: record.review_en ?? null,
    is_spoiler: record.is_spoiler,
    updated_at: record.updated_at,
    source_url: record.source_url,
    user: Array.isArray(record.user) ? record.user[0] : record.user,
  }))
}

const getReviewFeedCached = unstable_cache(
  fetchReviewFeed,
  ['review-feed'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getReviewFeed(params: GetReviewFeedParams): Promise<ReviewFeedItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return getReviewFeedCached(
    params.contentId,
    params.limit ?? 20,
    params.offset ?? 0,
    params.excludeUserId ?? null,
    user?.id ?? null,
  )
}
