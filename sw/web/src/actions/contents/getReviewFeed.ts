'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { getLocale } from 'next-intl/server'
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
  review_en?: string | null
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
  locale: string,
): Promise<ReviewFeedItem[]> {
  const supabase = createStaticClient()

  // 영어 감상문은 en 화면에서만 쓰인다 — ko 응답에서 수신 제외 (egress 절감)
  const reviewEnSelect = locale === 'en' ? 'review_en,' : ''

  let query = supabase
    .from('user_contents')
    .select(`
      id,
      rating,
      review,
      ${reviewEnSelect}
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

  return ((data || []) as unknown as ReviewFeedRow[]).map((record): ReviewFeedItem => ({
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
  // user_contents(감상문) + profiles(작성자 표시 정보) 조인
  { revalidate: 3600, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

// 콘텐츠 상세의 ISR 본문용. viewer별 제외 규칙을 섞지 않아 모든 방문자가
// 같은 공개 리뷰 HTML을 CDN에서 공유할 수 있다.
export async function getPublicReviewFeed(
  params: GetReviewFeedParams,
  locale: string,
): Promise<ReviewFeedItem[]> {
  // 바깥의 콘텐츠 ISR 문서가 결과를 보관한다. 1시간 Data Cache를 중첩하면
  // 페이지 전체의 재검증 주기가 짧아질 수 있으므로 공개 첫 화면은 직접 읽는다.
  return fetchReviewFeed(
    params.contentId,
    params.limit ?? 20,
    params.offset ?? 0,
    params.excludeUserId ?? null,
    null,
    locale,
  )
}

export async function getReviewFeed(params: GetReviewFeedParams): Promise<ReviewFeedItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()

  return getReviewFeedCached(
    params.contentId,
    params.limit ?? 20,
    params.offset ?? 0,
    params.excludeUserId ?? null,
    user?.id ?? null,
    locale,
  )
}
