'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebFeedResponse, CelebReview } from '@/types/home'
import type { ContentType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

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
      review_en,
      is_spoiler,
      source_url,
      updated_at,
      content:contents!user_contents_content_id_fkey!inner(
        id, type, user_count,
        content_locales(${CL_SELECT})
      ),
      celeb:profiles!user_contents_user_id_fkey!inner(
        id,
        slug,
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

  const filtered = sliced.filter(row => row.content && row.celeb && row.review)

  // 셀럽 카운트 배치 조회
  const contentIds = [...new Set(filtered.map(row => {
    const c = Array.isArray(row.content) ? row.content[0] : row.content
    return c.id
  }))]

  const celebCountMap = new Map<string, number>()
  if (contentIds.length > 0) {
    const { data: counts } = await supabase
      .from('user_contents')
      .select('content_id, profiles!user_contents_user_id_fkey!inner(profile_type)')
      .in('content_id', contentIds)
      .eq('profiles.profile_type', 'CELEB')

    if (counts) {
      for (const row of counts) {
        celebCountMap.set(row.content_id, (celebCountMap.get(row.content_id) ?? 0) + 1)
      }
    }
  }

  const locale = await getLocale()
  const reviews: CelebReview[] = filtered.map(row => {
      const content = Array.isArray(row.content) ? row.content[0] : row.content
      const celeb = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb

      const flat = flattenLocales((content as any).content_locales as ContentLocaleRow[] | null, locale)
      return {
        id: row.id,
        rating: row.rating,
        review: row.review as string,
        review_en: (row as any).review_en ?? null,
        is_spoiler: row.is_spoiler ?? false,
        source_url: row.source_url ?? null,
        updated_at: row.updated_at,
        content: {
          id: content.id,
          title: flat.title,
          creator: flat.creator,
          thumbnail_url: flat.thumbnail_url,
          type: content.type as ContentType,
          celeb_count: celebCountMap.get(content.id) ?? 0,
          user_count: content.user_count ?? 0,
          title_ko: flat.title_ko,
          title_en: flat.title_en,
          creator_en: flat.creator_en,
          isbn_en: flat.isbn_en,
          thumbnail_en: flat.thumbnail_en,
          has_en_edition: flat.has_en_edition,
        },
        celeb: {
          id: celeb.id,
          slug: celeb.slug ?? null,
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
