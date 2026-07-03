'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, ContentStatus, VisibilityType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import { sanitizeSearchTerm } from '@/lib/utils/search-sanitize'

type SortByOption = 'recent' | 'rating_desc' | 'rating_asc'

interface GetMyContentsParams {
  status?: ContentStatus
  excludeStatus?: ContentStatus[]  // 제외할 상태 목록
  type?: ContentType
  page?: number
  limit?: number
  search?: string  // 제목/저자 검색
  hasReview?: boolean  // true=리뷰 있음, false=리뷰 없음
  sortBy?: SortByOption  // 서버 정렬 (title, creator는 클라이언트)
}

export interface UserContentWithContent {
  id: string
  user_id: string
  content_id: string
  status: ContentStatus
  is_recommended: boolean | null
  is_spoiler: boolean | null
  rating: number | null
  review: string | null
  review_en: string | null
  visibility: VisibilityType | null
  created_at: string
  updated_at: string
  completed_at: string | null
  is_pinned: boolean | null
  pinned_at: string | null
  source_url: string | null
  content: {
    id: string
    type: ContentType
    title: string
    creator: string | null
    thumbnail_url: string | null
    description: string | null
    publisher: string | null
    release_date: string | null
    metadata: Record<string, unknown> | null
    user_count: number | null
    title_ko: string | null
    title_en: string | null
    creator_en: string | null
    isbn_en: string | null
    thumbnail_en: string | null
    has_en_edition: boolean | null
  }
}

export interface GetMyContentsResponse {
  items: UserContentWithContent[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

// user_contents에서 실제 사용하는 컬럼만 (contributor_id, review_presets 제외)
const UC_SELECT_BASE = 'id, user_id, content_id, status, is_recommended, is_spoiler, rating, review, visibility, created_at, updated_at, completed_at, is_pinned, pinned_at, source_url'

export async function getMyContents(params: GetMyContentsParams = {}): Promise<GetMyContentsResponse> {
  const supabase = await createClient()
  const locale = await getLocale()
  const { page = 1, limit = 20, type, status, excludeStatus, search, hasReview, sortBy = 'recent' } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const offset = (page - 1) * limit

  // isbn은 isbn_en 플래튼에 필요. description/publisher/affiliate_url은 미사용 — 제외
  const contentFields = `id, type, release_date, metadata, user_count, content_locales(${CL_SELECT_LIST}, isbn)`

  // 검색 필터 - content_locales에서 2-step 검색 (.or() 보간 인젝션 차단)
  let searchContentIds: string[] | null = null
  const safeSearch = search ? sanitizeSearchTerm(search) : ''
  if (safeSearch.length >= 2) {
    const searchTerm = `%${safeSearch}%`
    // egress-allow: 본인 서재 검색 1단계 — content_id만 송출
    const { data: matchIds } = await supabase
      .from('content_locales')
      .select('content_id')
      .or(`title.ilike.${searchTerm},creator.ilike.${searchTerm}`)
    if (!matchIds?.length) return { items: [], total: 0, page, totalPages: 0, hasMore: false }
    searchContentIds = [...new Set(matchIds.map(m => m.content_id))]
  }

  const needsInnerJoin = !!type
  const contentJoin = needsInnerJoin ? `content:contents!inner(${contentFields})` : `content:contents(${contentFields})`

  // egress-allow: 본인 서재 목록 — 추가/삭제 즉시 반영 필요, 캐시 부적합 (컬럼 슬림화 적용)
  // 영어 감상문은 en 화면에서만 쓰인다 — ko 응답에서 수신 제외 (egress 절감)
  const ucSelect = locale === 'en' ? `${UC_SELECT_BASE}, review_en` : UC_SELECT_BASE
  let query = supabase
    .from('user_contents')
    .select(`
      ${ucSelect},
      ${contentJoin}
    `, { count: 'exact' })
    .eq('user_id', user.id)

  // 정렬
  if (sortBy === 'rating_desc') {
    query = query.order('rating', { ascending: false, nullsFirst: false })
  } else if (sortBy === 'rating_asc') {
    query = query.order('rating', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  // type 필터 - DB 쿼리에서 직접 적용
  if (type) {
    query = query.eq('content.type', type)
  }

  // 검색 결과 content_id 필터
  if (searchContentIds) {
    query = query.in('content_id', searchContentIds)
  }

  // 리뷰 필터
  if (hasReview === true) {
    query = query.not('review', 'is', null).neq('review', '')
  } else if (hasReview === false) {
    query = query.or('review.is.null,review.eq.')
  }

  // 상태 필터
  if (status) {
    query = query.eq('status', status)
  }

  // 제외할 상태 필터
  if (excludeStatus?.length) {
    query = query.not('status', 'in', `(${excludeStatus.join(',')})`)
  }

  // 페이지네이션
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('콘텐츠 조회 에러:', error)
    throw new Error('콘텐츠 목록을 불러오는데 실패했습니다')
  }

  // content가 null인 항목 필터링 + content_locales 플래튼
  const rows = (data || []) as unknown as Record<string, unknown>[]
  const items = rows.filter((item) =>
    item.content !== null
  ).map(item => {
    const c = item.content as unknown as Record<string, unknown>
    const locales = c.content_locales as ContentLocaleRow[] | null
    const flat = flattenLocales(locales, locale)
    return {
      ...item,
      review_en: (item.review_en as string | undefined) ?? null,
      content: {
        id: c.id as string,
        type: c.type as ContentType,
        title: flat.title,
        creator: flat.creator,
        thumbnail_url: flat.thumbnail_url,
        description: flat.description,
        publisher: flat.publisher,
        release_date: c.release_date as string | null,
        metadata: c.metadata as Record<string, unknown> | null,
        user_count: c.user_count as number | null,
        title_ko: flat.title_ko,
        title_en: flat.title_en,
        creator_en: flat.creator_en,
        isbn_en: flat.isbn_en,
        thumbnail_en: flat.thumbnail_en,
        has_en_edition: flat.has_en_edition,
      },
    }
  }) as unknown as UserContentWithContent[]

  const total = count || 0

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: offset + items.length < total,
  }
}
