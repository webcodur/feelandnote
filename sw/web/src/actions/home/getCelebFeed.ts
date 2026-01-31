'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebFeedResponse, CelebReview } from '@/types/home'
import type { ContentType } from '@/types/database'

interface GetCelebFeedParams {
  contentType?: string  // 'all' | 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'
  cursor?: string       // ISO datetime string
  limit?: number
}

const EMPTY_RESPONSE: CelebFeedResponse = { reviews: [], nextCursor: null, hasMore: false }

export async function getCelebFeed(
  params: GetCelebFeedParams = {}
): Promise<CelebFeedResponse> {
  const { contentType = 'all', cursor, limit = 20 } = params

  const supabase = await createClient()

  // 셀럽 리뷰 조회 - profiles 조인으로 CELEB 필터링 (별도 쿼리 불필요)
  // contents 조인에서 type 필터링 (별도 쿼리 불필요)
  let query = supabase
    .from('user_contents')
    .select(`
      id,
      rating,
      review,
      is_spoiler,
      source_url,
      updated_at,
      content:contents!user_contents_content_id_fkey!inner(
        id,
        title,
        creator,
        thumbnail_url,
        type
      ),
      celeb:profiles!user_contents_user_id_fkey!inner(
        id,
        nickname,
        avatar_url,
        profession,
        is_verified,
        claimed_by,
        profile_type,
        status
      )
    `)
    .not('review', 'is', null)
    .eq('visibility', 'public')
    .eq('celeb.profile_type', 'CELEB')
    .eq('celeb.status', 'active')
    .order('updated_at', { ascending: false })
    .limit(limit + 1)

  // 콘텐츠 타입 필터 - 조인된 contents에서 직접 필터링
  if (contentType !== 'all') {
    query = query.eq('content.type', contentType)
  }

  // 커서 기반 페이지네이션
  if (cursor) {
    query = query.lt('updated_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    console.error('셀럽 피드 조회 에러:', error)
    return EMPTY_RESPONSE
  }

  if (!data || data.length === 0) {
    return EMPTY_RESPONSE
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
          profession: celeb.profession ?? null,
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
