'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActivityActionType, ActivityTargetType, ContentType } from '@/types/database'

export interface FeedActivity {
  id: string
  user_id: string
  user_nickname: string
  user_avatar_url: string | null
  user_title: { id: string; name: string; grade: string } | null
  action_type: ActivityActionType
  target_type: ActivityTargetType
  target_id: string
  content_id: string | null
  content_title: string | null
  content_thumbnail: string | null
  content_type: ContentType | null
  review: string | null
  rating: number | null
  created_at: string
}

interface GetFeedActivitiesParams {
  limit?: number
  cursor?: string
  contentType?: string
}

interface GetFeedActivitiesResult {
  activities: FeedActivity[]
  nextCursor: string | null
}

export async function getFeedActivities(
  params: GetFeedActivitiesParams = {}
): Promise<GetFeedActivitiesResult> {
  const { limit = 20, cursor, contentType } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('[getFeedActivities] 로그인 안됨')
    return { activities: [], nextCursor: null }
  }

  console.log('[getFeedActivities] user.id:', user.id)

  // 내가 팔로우하는 사람들 ID 조회
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  console.log('[getFeedActivities] following:', following)

  if (!following || following.length === 0) {
    console.log('[getFeedActivities] 팔로잉 없음')
    return { activities: [], nextCursor: null }
  }

  const followingIds = following.map(f => f.following_id)
  console.log('[getFeedActivities] followingIds:', followingIds)

  // contentType 필터가 있으면 해당 타입의 content_id 목록 조회
  let filteredContentIds: string[] | null = null
  if (contentType && contentType !== 'all') {
    const { data: filteredContents } = await supabase
      .from('contents')
      .select('id')
      .eq('type', contentType)

    if (filteredContents && filteredContents.length > 0) {
      filteredContentIds = filteredContents.map(c => c.id)
    } else {
      // 해당 타입의 콘텐츠가 없으면 빈 결과 반환
      return { activities: [], nextCursor: null }
    }
  }

  // 팔로우한 사람들의 활동 로그 조회 (콘텐츠 추가, 리뷰 작성만)
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
      user:profiles!user_id(
        nickname,
        avatar_url,
        selected_title:titles!profiles_selected_title_id_fkey(id, name, grade)
      )
    `)
    .in('user_id', followingIds)
    .in('action_type', ['CONTENT_ADD', 'REVIEW_UPDATE'])
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  // contentType 필터 적용
  if (filteredContentIds) {
    query = query.in('content_id', filteredContentIds)
  }

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
  let userContentsMap: Record<string, { review: string | null; rating: number | null }> = {}

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

    // user_contents에서 리뷰/별점 조회 (user_id + content_id 조합 키)
    const userContentPairs = sliced
      .filter(item => item.content_id)
      .map(item => ({ user_id: item.user_id, content_id: item.content_id }))

    const { data: userContents } = await supabase
      .from('user_contents')
      .select('user_id, content_id, review, rating')
      .in('content_id', contentIds)

    if (userContents) {
      userContentsMap = Object.fromEntries(
        userContents.map(uc => [
          `${uc.user_id}:${uc.content_id}`,
          { review: uc.review, rating: uc.rating }
        ])
      )
    }
  }

  type TitleData = { id: string; name: string; grade: string } | null
  type UserProfile = { nickname: string; avatar_url: string | null; selected_title: TitleData }

  const activities: FeedActivity[] = sliced.map((item) => {
    const userProfile = (Array.isArray(item.user) ? item.user[0] : item.user) as UserProfile | null
    const contentInfo = item.content_id ? contentsMap[item.content_id] : null
    const userContentKey = item.content_id ? `${item.user_id}:${item.content_id}` : null
    const userContentInfo = userContentKey ? userContentsMap[userContentKey] : null

    return {
      id: item.id,
      user_id: item.user_id,
      user_nickname: userProfile?.nickname || 'User',
      user_avatar_url: userProfile?.avatar_url || null,
      user_title: userProfile?.selected_title || null,
      action_type: item.action_type as ActivityActionType,
      target_type: item.target_type as ActivityTargetType,
      target_id: item.target_id,
      content_id: item.content_id,
      content_title: contentInfo?.title || null,
      content_thumbnail: contentInfo?.thumbnail_url || null,
      content_type: contentInfo?.type || null,
      review: userContentInfo?.review || null,
      rating: userContentInfo?.rating || null,
      created_at: item.created_at,
    }
  })

  return {
    activities,
    nextCursor: hasMore ? activities[activities.length - 1].created_at : null,
  }
}
