'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActivityActionType, ActivityTargetType, ContentType } from '@/types/database'

export interface FeedActivity {
  id: string
  user_id: string
  user_nickname: string
  user_avatar_url: string | null
  action_type: ActivityActionType
  target_type: ActivityTargetType
  target_id: string
  content_id: string | null
  content_title: string | null
  content_thumbnail: string | null
  content_type: ContentType | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface GetFeedActivitiesParams {
  limit?: number
  cursor?: string
}

interface GetFeedActivitiesResult {
  activities: FeedActivity[]
  nextCursor: string | null
}

export async function getFeedActivities(
  params: GetFeedActivitiesParams = {}
): Promise<GetFeedActivitiesResult> {
  const { limit = 20, cursor } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { activities: [], nextCursor: null }

  // 내가 팔로우하는 사람들 ID 조회
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  if (!following || following.length === 0) {
    return { activities: [], nextCursor: null }
  }

  const followingIds = following.map(f => f.following_id)

  // 팔로우한 사람들의 활동 로그 조회 (user만 FK 조인)
  let query = supabase
    .from('activity_logs')
    .select(`
      id,
      user_id,
      action_type,
      target_type,
      target_id,
      content_id,
      metadata,
      created_at,
      user:profiles!user_id(nickname, avatar_url)
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('피드 활동 조회 에러:', error)
    return { activities: [], nextCursor: null }
  }

  const hasMore = data.length > limit
  const sliced = hasMore ? data.slice(0, limit) : data

  // content_id 목록 추출해서 별도 조회
  const contentIds = [...new Set(sliced.map(item => item.content_id).filter(Boolean))] as string[]

  let contentsMap: Record<string, { title: string; thumbnail_url: string | null; type: ContentType }> = {}

  if (contentIds.length > 0) {
    const { data: contents } = await supabase
      .from('contents')
      .select('id, title, thumbnail_url, type')
      .in('id', contentIds)

    if (contents) {
      contentsMap = Object.fromEntries(
        contents.map(c => [c.id, { title: c.title, thumbnail_url: c.thumbnail_url, type: c.type as ContentType }])
      )
    }
  }

  type UserProfile = { nickname: string; avatar_url: string | null }

  const activities: FeedActivity[] = sliced.map((item) => {
    const userProfile = (Array.isArray(item.user) ? item.user[0] : item.user) as UserProfile | null
    const contentInfo = item.content_id ? contentsMap[item.content_id] : null

    return {
      id: item.id,
      user_id: item.user_id,
      user_nickname: userProfile?.nickname || 'User',
      user_avatar_url: userProfile?.avatar_url || null,
      action_type: item.action_type as ActivityActionType,
      target_type: item.target_type as ActivityTargetType,
      target_id: item.target_id,
      content_id: item.content_id,
      content_title: contentInfo?.title || null,
      content_thumbnail: contentInfo?.thumbnail_url || null,
      content_type: contentInfo?.type || null,
      metadata: item.metadata as Record<string, unknown> | null,
      created_at: item.created_at,
    }
  })

  return {
    activities,
    nextCursor: hasMore ? activities[activities.length - 1].created_at : null,
  }
}
