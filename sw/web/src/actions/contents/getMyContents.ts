'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, ContentStatus, Category, VisibilityType } from '@/types/database'

interface GetMyContentsParams {
  status?: ContentStatus
  type?: ContentType
  categoryId?: string | null  // undefined = 전체, null = 미분류, string = 특정 분류
  page?: number
  limit?: number
}

export interface UserContentWithContent {
  id: string
  user_id: string
  content_id: string
  status: string
  category_id: string | null
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
  }
  category?: Category | null
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
  const { page = 1, limit = 20, categoryId, type, status } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const offset = (page - 1) * limit

  // type 필터가 있으면 inner join으로 contents 테이블에서 직접 필터링
  const contentJoin = type ? 'content:contents!inner(*)' : 'content:contents(*)'

  let query = supabase
    .from('user_contents')
    .select(`
      *,
      ${contentJoin},
      category:categories(*)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // type 필터 - DB 쿼리에서 직접 적용
  if (type) {
    query = query.eq('content.type', type)
  }

  // 분류 필터
  if (categoryId === null) {
    query = query.is('category_id', null)
  } else if (categoryId !== undefined) {
    query = query.eq('category_id', categoryId)
  }

  // 상태 필터
  if (status) {
    query = query.eq('status', status)
  }

  // 페이지네이션
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('콘텐츠 조회 에러:', error)
    throw new Error('콘텐츠 목록을 불러오는데 실패했습니다')
  }

  // content가 null인 항목 필터링
  const items = (data || []).filter((item): item is UserContentWithContent =>
    item.content !== null
  )

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
      ${contentJoin},
      category:categories(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // type 필터 - DB 쿼리에서 직접 적용
  if (params.type) {
    query = query.eq('content.type', params.type)
  }

  if (params.categoryId === null) {
    query = query.is('category_id', null)
  } else if (params.categoryId !== undefined) {
    query = query.eq('category_id', params.categoryId)
  }

  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('콘텐츠 조회 에러:', error)
    throw new Error('콘텐츠 목록을 불러오는데 실패했습니다')
  }

  const items = (data || []).filter((item): item is UserContentWithContent =>
    item.content !== null
  )

  return items
}
