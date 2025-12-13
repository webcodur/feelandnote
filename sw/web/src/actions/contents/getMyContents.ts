'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, ContentStatus, Folder } from '@/types/database'

interface GetMyContentsParams {
  status?: ContentStatus
  type?: ContentType
  folderId?: string | null  // undefined = 전체, null = 미분류, string = 특정 폴더
  page?: number
  limit?: number
}

export interface UserContentWithContent {
  id: string
  user_id: string
  content_id: string
  status: string
  progress: number | null
  progress_type: string | null
  folder_id: string | null
  created_at: string
  updated_at: string
  content: {
    id: string
    type: string
    title: string
    creator: string | null
    thumbnail_url: string | null
    description: string | null
    publisher: string | null
    release_date: string | null
    metadata: Record<string, unknown> | null
  }
  folder?: Folder | null
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
  const { page = 1, limit = 20, folderId, type, status } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const offset = (page - 1) * limit

  let query = supabase
    .from('user_contents')
    .select(`
      *,
      content:contents(*),
      folder:folders(*)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 폴더 필터
  if (folderId === null) {
    query = query.is('folder_id', null)
  } else if (folderId !== undefined) {
    query = query.eq('folder_id', folderId)
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

  // content가 null인 항목 필터링 및 type 필터
  let items = (data || []).filter((item): item is UserContentWithContent =>
    item.content !== null
  )

  if (type) {
    items = items.filter((item) => item.content.type === type)
  }

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

  let query = supabase
    .from('user_contents')
    .select(`
      *,
      content:contents(*),
      folder:folders(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (params.folderId === null) {
    query = query.is('folder_id', null)
  } else if (params.folderId !== undefined) {
    query = query.eq('folder_id', params.folderId)
  }

  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('콘텐츠 조회 에러:', error)
    throw new Error('콘텐츠 목록을 불러오는데 실패했습니다')
  }

  let items = (data || []).filter((item): item is UserContentWithContent =>
    item.content !== null
  )

  if (params.type) {
    items = items.filter((item) => item.content.type === params.type)
  }

  return items
}
