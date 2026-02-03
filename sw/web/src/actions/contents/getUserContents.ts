'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, ContentStatus, VisibilityType } from '@/types/database'

interface GetUserContentsParams {
  userId: string
  type?: ContentType
  status?: ContentStatus
  page?: number
  limit?: number
  search?: string  // 제목/저자 검색
}

export interface UserContentPublic {
  id: string
  content_id: string
  status: ContentStatus
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
  const { userId, type, status, page = 1, limit = 20, search } = params
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
      rating,
      review,
      visibility,
      created_at,
      source_url,
      ${contentJoin}
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // 타인 프로필 조회 시 public만 표시
  if (!isOwnProfile) {
    query = query.eq('visibility', 'public')
  }

  if (type) {
    query = query.eq('content.type', type)
  }

  if (status) {
    query = query.eq('status', status)
  }

  // 검색 필터 - 제목 또는 저자
  if (search && search.trim().length >= 2) {
    const searchTerm = `%${search.trim()}%`
    query = query.or(`title.ilike.${searchTerm},creator.ilike.${searchTerm}`, { referencedTable: 'content' })
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
    rating: number | null
    review: string | null
    visibility: VisibilityType | null
    created_at: string
    source_url: string | null
    content: ContentData
  }>

  const items: UserContentPublic[] = validContents.map(item => ({
    id: item.id,
    content_id: item.content_id,
    status: item.status as ContentStatus,
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
