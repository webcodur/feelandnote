'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebFeedResponse, CelebReview } from '@/types/home'
import type { ContentType } from '@/types/database'

interface GetCelebFeedParams {
  contentType?: string  // 'all' | 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'
  cursor?: string       // ISO datetime string
  limit?: number
}

export async function getCelebFeed(
  params: GetCelebFeedParams = {}
): Promise<CelebFeedResponse> {
  const { contentType = 'all', cursor, limit = 20 } = params

  const supabase = await createClient()

  // 셀럽 ID 목록 먼저 조회
  const { data: celebs } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  if (!celebs || celebs.length === 0) {
    return { reviews: [], nextCursor: null, hasMore: false }
  }

  const celebIds = celebs.map(c => c.id)

  // 셀럽들의 리뷰 조회
  let query = supabase
    .from('user_contents')
    .select(`
      id,
      rating,
      review,
      is_spoiler,
      source_url,
      updated_at,
      content:contents!user_contents_content_id_fkey(
        id,
        title,
        creator,
        thumbnail_url,
        type
      ),
      celeb:profiles!user_contents_user_id_fkey(
        id,
        nickname,
        avatar_url,
        is_verified,
        claimed_by
      )
    `)
    .in('user_id', celebIds)
    .not('review', 'is', null)
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false })
    .limit(limit + 1)

  // 콘텐츠 타입 필터
  if (contentType !== 'all') {
    // 먼저 해당 타입의 콘텐츠 ID 조회
    const { data: filteredContents } = await supabase
      .from('contents')
      .select('id')
      .eq('type', contentType)

    if (!filteredContents || filteredContents.length === 0) {
      return { reviews: [], nextCursor: null, hasMore: false }
    }

    const contentIds = filteredContents.map(c => c.id)
    query = query.in('content_id', contentIds)
  }

  // 커서 기반 페이지네이션
  if (cursor) {
    query = query.lt('updated_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    console.error('셀럽 피드 조회 에러:', error)
    return { reviews: [], nextCursor: null, hasMore: false }
  }

  if (!data || data.length === 0) {
    return { reviews: [], nextCursor: null, hasMore: false }
  }

  const hasMore = data.length > limit
  const sliced = hasMore ? data.slice(0, limit) : data

  const reviews: CelebReview[] = sliced
    .filter(row => row.content && row.celeb && row.review)
    .map(row => {
      const content = Array.isArray(row.content) ? row.content[0] : row.content
      const celeb = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb

      return {
        id: row.id,
        rating: row.rating,
        review: row.review as string,
        is_spoiler: row.is_spoiler ?? false,
        source_url: row.source_url ?? null,
        updated_at: row.updated_at,
        content: {
          id: content.id,
          title: content.title,
          creator: content.creator,
          thumbnail_url: content.thumbnail_url,
          type: content.type as ContentType,
        },
        celeb: {
          id: celeb.id,
          nickname: celeb.nickname || '',
          avatar_url: celeb.avatar_url,
          is_verified: celeb.is_verified ?? false,
          is_platform_managed: celeb.claimed_by === null,
        },
      }
    })

  const nextCursor = hasMore && reviews.length > 0
    ? reviews[reviews.length - 1].updated_at
    : null

  return { reviews, nextCursor, hasMore }
}
