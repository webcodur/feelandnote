'use server'

import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { ContentType, ContentStatus, VisibilityType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

type SortByOption = 'recent' | 'rating_desc' | 'rating_asc'

interface GetUserContentsParams {
  userId: string
  type?: ContentType
  status?: ContentStatus
  page?: number
  limit?: number
  search?: string  // 제목/저자 검색
  hasReview?: boolean  // true=리뷰 있음, false=리뷰 없음
  sortBy?: SortByOption  // 서버 정렬
}

export interface UserContentPublic {
  id: string
  content_id: string
  status: ContentStatus
  is_recommended: boolean
  visibility: VisibilityType | null
  created_at: string
  source_url: string | null
  content: {
    id: string
    type: ContentType
    title: string
    creator: string | null
    thumbnail_url: string | null
    metadata: Record<string, unknown> | null
    user_count: number | null
    title_ko: string | null
    title_en: string | null
    creator_en: string | null
    isbn_en: string | null
    thumbnail_en: string | null
    has_en_edition: boolean | null
  }
  // 공개된 기록 요약
  public_record?: {
    rating: number | null
    content_preview: string | null
    content_preview_en: string | null
    review_presets: string[] | null
    is_spoiler?: boolean
  } | null
}

export interface GetUserContentsResponse {
  items: UserContentPublic[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

interface QueryUserContentsOptions {
  userId: string
  type?: ContentType
  page: number
  limit: number
  search?: string
  hasReview?: boolean
  sortBy: SortByOption
  locale: string
  isOwnProfile: boolean
}

// 서재 조회 공통 쿼리 — 클라이언트(cookie/static)와 viewer 의존 여부만 외부에서 주입
async function queryUserContents(
  supabase: SupabaseClient,
  opts: QueryUserContentsOptions,
): Promise<GetUserContentsResponse> {
  const { userId, type, page, limit, search, hasReview, sortBy, locale, isOwnProfile } = opts
  const offset = (page - 1) * limit

  // isbn은 isbn_en 플래튼에 필요. description/publisher/affiliate_url은 미사용 — 제외
  const contentFields = `id, type, metadata, user_count, content_locales(${CL_SELECT_LIST}, isbn)`

  // 검색 필터 - content_locales에서 2-step 검색
  let searchContentIds: string[] | null = null
  if (search && search.trim().length >= 2) {
    const searchTerm = `%${search.trim()}%`
    const { data: matchIds } = await supabase
      .from('content_locales')
      .select('content_id')
      .or(`title.ilike.${searchTerm},creator.ilike.${searchTerm}`)
    if (!matchIds?.length) return { items: [], total: 0, page, totalPages: 0, hasMore: false }
    searchContentIds = [...new Set(matchIds.map(m => m.content_id))]
  }

  const needsInnerJoin = !!type
  const contentJoin = needsInnerJoin ? `content:contents!inner(${contentFields})` : `content:contents(${contentFields})`

  // 영어 감상문은 en 화면에서만 쓰인다 — ko 응답에서 수신 제외 (egress 절감)
  const reviewEnSelect = locale === 'en' ? 'review_en,' : ''

  let query = supabase
    .from('user_contents')
    .select(`
      id,
      content_id,
      status,
      is_recommended,
      rating,
      review,
      ${reviewEnSelect}
      review_presets,
      is_spoiler,
      visibility,
      created_at,
      source_url,
      ${contentJoin}
    `, { count: 'exact' })
    .eq('user_id', userId)

  // 정렬
  if (sortBy === 'rating_desc') {
    query = query.order('rating', { ascending: false, nullsFirst: false })
  } else if (sortBy === 'rating_asc') {
    query = query.order('rating', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  // 타인 프로필 조회 시 public만 표시
  if (!isOwnProfile) {
    query = query.eq('visibility', 'public')
  }

  if (type) {
    query = query.eq('content.type', type)
  }

  // status 필터 제거 (사용자 요구사항: status 무관하게 리뷰 유무로만 판단)

  // 검색 결과 content_id 필터
  if (searchContentIds) {
    query = query.in('content_id', searchContentIds)
  }

  // 리뷰 필터
  if (hasReview === true) {
    // 리뷰가 있는 경우: null이 아니고 빈 문자열도 아닌 경우
    query = query.not('review', 'is', null).neq('review', '')
  } else if (hasReview === false) {
    // 리뷰가 없는 경우: null이거나 빈 문자열인 경우
    query = query.or('review.is.null,review.eq.')
  }

  query = query.range(offset, offset + limit - 1)

  const { data: userContents, count, error } = await query

  if (error) {
    console.error('콘텐츠 조회 에러:', error)
    throw new Error('콘텐츠 목록을 불러오는데 실패했습니다')
  }

  // content가 null인 항목 필터링 + content_locales 플래튼
  const validContents = ((userContents || []) as unknown as Record<string, unknown>[])
    .filter(item => item.content !== null)

  const items: UserContentPublic[] = validContents.map(item => {
    const rawContent = Array.isArray(item.content) ? item.content[0] : item.content
    const c = rawContent as unknown as Record<string, unknown>
    const locales = c.content_locales as ContentLocaleRow[] | null
    const flat = flattenLocales(locales, locale)
    const raw = item as unknown as Record<string, unknown>
    return {
      id: item.id as string,
      content_id: raw.content_id as string,
      status: item.status as ContentStatus,
      is_recommended: (raw.is_recommended as boolean) ?? false,
      visibility: raw.visibility as VisibilityType | null,
      created_at: raw.created_at as string,
      source_url: raw.source_url as string | null,
      content: {
        id: c.id as string,
        type: c.type as ContentType,
        title: flat.title,
        creator: flat.creator,
        thumbnail_url: flat.thumbnail_url,
        metadata: c.metadata as Record<string, unknown> | null,
        user_count: c.user_count as number | null,
        title_ko: flat.title_ko,
        title_en: flat.title_en,
        creator_en: flat.creator_en,
        isbn_en: flat.isbn_en,
        thumbnail_en: flat.thumbnail_en,
        has_en_edition: flat.has_en_edition,
      },
      public_record: (raw.rating || raw.review || ((raw.review_presets as string[] | null)?.length)) ? {
        rating: raw.rating as number | null,
        content_preview: (raw.review as string) || null,
        content_preview_en: (raw.review_en as string | undefined) || null,
        review_presets: (raw.review_presets as string[]) || null,
        is_spoiler: raw.is_spoiler as boolean,
      } : null,
    }
  })

  const total = count || 0

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: offset + items.length < total,
  }
}

// 타인 서재 — 공개 테이블(user_contents, contents, content_locales)만 읽으므로 캐시
const getCachedPublicUserContents = unstable_cache(
  async (
    userId: string,
    type: ContentType | undefined,
    page: number,
    limit: number,
    search: string | undefined,
    hasReview: boolean | undefined,
    sortBy: SortByOption,
    locale: string,
  ) =>
    queryUserContents(createStaticClient(), {
      userId, type, page, limit, search, hasReview, sortBy, locale,
      isOwnProfile: false,
    }),
  ['public-user-contents'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getUserContents(params: GetUserContentsParams): Promise<GetUserContentsResponse> {
  const { userId, type, page = 1, limit = 20, search, hasReview, sortBy = 'recent' } = params
  const supabase = await createClient()
  const locale = await getLocale()

  // 현재 로그인한 사용자 확인 (viewer 의존 — 캐시 외부)
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwnProfile = currentUser?.id === userId

  if (isOwnProfile) {
    // egress-allow: 본인 서재 — 추가/삭제 즉시 반영 필요, 캐시 부적합
    return queryUserContents(supabase, {
      userId, type, page, limit, search, hasReview, sortBy, locale,
      isOwnProfile: true,
    })
  }

  return getCachedPublicUserContents(userId, type, page, limit, search, hasReview, sortBy, locale)
}
