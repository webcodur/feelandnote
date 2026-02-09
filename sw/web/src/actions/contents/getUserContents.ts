'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, ContentStatus, VisibilityType } from '@/types/database'

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
  }
  // 공개된 기록 요약
  public_record?: {
    rating: number | null
    content_preview: string | null
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

export async function getUserContents(params: GetUserContentsParams): Promise<GetUserContentsResponse> {
  const { userId, type, status, page = 1, limit = 20, search, hasReview, sortBy = 'recent' } = params
  const supabase = await createClient()
  const offset = (page - 1) * limit

  // 현재 로그인한 사용자 확인
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwnProfile = currentUser?.id === userId

  // type이나 search 필터가 있으면 inner join
  const needsInnerJoin = type || search
  const contentJoin = needsInnerJoin ? 'content:contents!inner(*)' : 'content:contents(*)'

  let query = supabase
    .from('user_contents')
    .select(`
      id,
      content_id,
      status,
      is_recommended,
      rating,
      review,
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
  // if (status) {
  //   query = query.eq('status', status)
  // }

  // 검색 필터 - 제목 또는 저자
  if (search && search.trim().length >= 2) {
    const searchTerm = `%${search.trim()}%`
    query = query.or(`title.ilike.${searchTerm},creator.ilike.${searchTerm}`, { referencedTable: 'content' })
  }

  // 리뷰 필터 (강화됨)
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

  // content가 null인 항목 필터링 및 타입 정의
  interface ContentData {
    id: string
    type: string
    title: string
    creator: string | null
    thumbnail_url: string | null
    metadata: Record<string, unknown> | null
    user_count: number | null
  }

  const validContents = (userContents || []).filter(item => item.content !== null) as unknown as Array<{
    id: string
    content_id: string
    status: string
    is_recommended: boolean
    rating: number | null
    review: string | null
    is_spoiler: boolean
    visibility: VisibilityType | null
    created_at: string
    source_url: string | null
    content: ContentData
  }>

  const items: UserContentPublic[] = validContents.map(item => ({
    id: item.id,
    content_id: item.content_id,
    status: item.status as ContentStatus,
    is_recommended: item.is_recommended ?? false,
    visibility: item.visibility,
    created_at: item.created_at,
    source_url: item.source_url,
    content: {
      id: item.content.id,
      type: item.content.type as ContentType,
      title: item.content.title,
      creator: item.content.creator,
      thumbnail_url: item.content.thumbnail_url,
      metadata: item.content.metadata || null,
      user_count: item.content.user_count ?? null,
    },
    public_record: (item.rating || item.review) ? {
      rating: item.rating,
      content_preview: item.review || null,
      is_spoiler: item.is_spoiler, 
    } : null,
  }))

  const total = count || 0

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: offset + items.length < total,
  }
}

// 전체 조회 (페이지네이션 없음)
export async function getUserContentsAll(userId: string, type?: ContentType): Promise<UserContentPublic[]> {
  const result = await getUserContents({ userId, type, page: 1, limit: 1000 })
  return result.items
}
