'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/supabase/static'
import type { CelebFeedResponse, CelebReview } from '@/types/home'
import type { ContentType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

interface GetCelebFeedParams {
  contentType?: string
  cursor?: string
  limit?: number
}

const EMPTY_RESPONSE: CelebFeedResponse = { reviews: [], nextCursor: null, hasMore: false }

// contents 조인 select 결과 행
interface FeedContentRow {
  id: string
  type: string
  user_count: number | null
  content_locales: ContentLocaleRow[] | null
}

// profiles 조인 select 결과 행
interface FeedCelebRow {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  is_verified: boolean | null
  claimed_by: string | null
  profile_type: string | null
  status: string | null
}

// user_contents select 결과 행
interface FeedRow {
  id: string
  rating: number | null
  review: string | null
  review_en?: string | null
  is_spoiler: boolean | null
  source_url: string | null
  updated_at: string
  content: FeedContentRow | FeedContentRow[] | null
  celeb: FeedCelebRow | FeedCelebRow[] | null
}

async function fetchCelebFeed(
  contentType: string,
  cursor: string | null,
  limit: number,
  locale: string,
): Promise<CelebFeedResponse> {
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
      source_url,
      updated_at,
      content:contents!user_contents_content_id_fkey!inner(
        id, type, user_count,
        content_locales(${CL_SELECT_LIST})
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
    // 신화·관계 인물은 피드에서 제외
    .in('celeb.celeb_tier', [...LISTING_DEFAULT_TIERS])
    .order('updated_at', { ascending: false })
    .limit(limit + 1)

  if (contentType !== 'all') {
    query = query.eq('content.type', contentType)
  }

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

  const rows = data as unknown as FeedRow[]
  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows

  const filtered = sliced.filter((row): row is FeedRow & { content: FeedContentRow | FeedContentRow[]; celeb: FeedCelebRow | FeedCelebRow[]; review: string } =>
    Boolean(row.content && row.celeb && row.review))

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
      for (const row of counts as { content_id: string }[]) {
        celebCountMap.set(row.content_id, (celebCountMap.get(row.content_id) ?? 0) + 1)
      }
    }
  }

  const reviews: CelebReview[] = filtered.map(row => {
    const content = Array.isArray(row.content) ? row.content[0] : row.content
    const celeb = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb

    const flat = flattenLocales(content.content_locales, locale)
    return {
      id: row.id,
      rating: row.rating,
      review: row.review,
      review_en: row.review_en ?? null,
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

const getCelebFeedCached = unstable_cache(
  fetchCelebFeed,
  ['celeb-feed'],
  // user_contents·contents + profiles(셀럽 필터·표시 정보) 조인
  { revalidate: 3600, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getCelebFeed(
  params: GetCelebFeedParams = {}
): Promise<CelebFeedResponse> {
  const { contentType = 'all', cursor, limit = 20 } = params
  const locale = await getLocale()
  return getCelebFeedCached(contentType, cursor ?? null, limit, locale)
}
