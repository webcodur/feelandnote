'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, ContentStatus, VisibilityType } from '@/types/database'

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
  }
}

export interface GetMyContentsResponse {
  items: UserContentWithContent[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

export async function getMyContents(params: GetMyContentsParams = {}): Promise<GetMyContentsResponse> {
  const supabase = await createClient()
  const { page = 1, limit = 20, type, status, excludeStatus, search, hasReview, sortBy = 'recent' } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const offset = (page - 1) * limit

  // type이나 search 필터가 있으면 inner join
  const needsInnerJoin = type || search
  const contentJoin = needsInnerJoin ? 'content:contents!inner(*)' : 'content:contents(*)'

  let query = supabase
    .from('user_contents')
    .select(`
      *,
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

  // 검색 필터 - 제목 또는 저자
  if (search && search.trim().length >= 2) {
    const searchTerm = `%${search.trim()}%`
    query = query.or(`title.ilike.${searchTerm},creator.ilike.${searchTerm}`, { referencedTable: 'content' })
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

  // content가 null인 항목 필터링 + 타입 단언
  const items = (data || []).filter((item) =>
    item.content !== null
  ) as UserContentWithContent[]

  const total = count || 0

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: offset + items.length < total,
  }
}

// 기존 호환성을 위한 헬퍼 함수
export async function getMyContentsAll(params: Omit<GetMyContentsParams, 'page' | 'limit'> = {}): Promise<UserContentWithContent[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // type 필터가 있으면 inner join으로 contents 테이블에서 직접 필터링
  const contentJoin = params.type ? 'content:contents!inner(*)' : 'content:contents(*)'

  let query = supabase
    .from('user_contents')
    .select(`
      *,
      ${contentJoin}
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // type 필터 - DB 쿼리에서 직접 적용
  if (params.type) {
    query = query.eq('content.type', params.type)
  }


  if (params.status) {
    query = query.eq('status', params.status)
  }

  // 제외할 상태 필터
  if (params.excludeStatus?.length) {
    query = query.not('status', 'in', `(${params.excludeStatus.join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('콘텐츠 조회 에러:', error)
    throw new Error('콘텐츠 목록을 불러오는데 실패했습니다')
  }

  const items = (data || []).filter((item) =>
    item.content !== null
  ) as UserContentWithContent[]

  return items
}
