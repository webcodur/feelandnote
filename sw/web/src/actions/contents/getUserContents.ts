'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType } from '@/types/database'

interface GetUserContentsParams {
  userId: string
  type?: ContentType
  page?: number
  limit?: number
}

export interface UserContentPublic {
  id: string
  content_id: string
  status: string
  progress: number | null
  created_at: string
  content: {
    id: string
    type: string
    title: string
    creator: string | null
    thumbnail_url: string | null
  }
  // 공개된 기록 요약
  public_record?: {
    type: string
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
  const { userId, type, page = 1, limit = 20 } = params
  const supabase = await createClient()
  const offset = (page - 1) * limit

  // 현재 로그인한 사용자 확인
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // 팔로우 여부 확인
  let isFollower = false
  if (currentUser && currentUser.id !== userId) {
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .single()
    isFollower = !!followData
  }

  // visibility 조건: public은 항상, followers는 팔로워인 경우만
  const visibilityConditions = isFollower
    ? ['public', 'followers']
    : ['public']

  // 공개 기록이 있는 콘텐츠만 조회
  const contentJoin = type ? 'content:contents!inner(*)' : 'content:contents(*)'

  let query = supabase
    .from('user_contents')
    .select(`
      id,
      content_id,
      status,
      progress,
      created_at,
      ${contentJoin}
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('content.type', type)
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
  }

  const validContents = (userContents || []).filter(item => item.content !== null) as unknown as Array<{
    id: string
    content_id: string
    status: string
    progress: number | null
    created_at: string
    content: ContentData
  }>

  // 각 콘텐츠의 공개 기록 조회
  const contentIds = validContents.map(item => item.content_id)

  const { data: publicRecords } = await supabase
    .from('content_records')
    .select('content_id, type, rating, content')
    .eq('user_id', userId)
    .in('content_id', contentIds)
    .in('visibility', visibilityConditions)
    .order('created_at', { ascending: false })

  // 기록 맵 생성 (콘텐츠당 첫 번째 공개 기록)
  const recordMap = new Map<string, { type: string; rating: number | null; content_preview: string | null }>()
  publicRecords?.forEach(record => {
    if (!recordMap.has(record.content_id)) {
      recordMap.set(record.content_id, {
        type: record.type,
        rating: record.rating,
        content_preview: record.content?.slice(0, 100) || null,
      })
    }
  })

  // 공개 기록이 있는 콘텐츠만 필터링
  const items: UserContentPublic[] = validContents
    .filter(item => recordMap.has(item.content_id))
    .map(item => ({
      id: item.id,
      content_id: item.content_id,
      status: item.status,
      progress: item.progress,
      created_at: item.created_at,
      content: {
        id: item.content.id,
        type: item.content.type,
        title: item.content.title,
        creator: item.content.creator,
        thumbnail_url: item.content.thumbnail_url,
      },
      public_record: recordMap.get(item.content_id) || null,
    }))

  const total = items.length

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
