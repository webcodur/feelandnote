'use server'

// egress-allow: activity_logs는 본인·팔로잉 RLS — anon 전환 시 빈 결과라 캐시 분리 불가
import { createClient } from '@/lib/supabase/server'
import type { FriendActivity, FriendActivityResponse } from '@/types/home'
import type { ContentType } from '@/types/database'

// contents + content_locales 조인 select 결과 행
interface ActivityContentRow {
  id: string
  type: string
  content_locales: { locale: string; title: string | null; thumbnail_url: string | null }[] | null
}

interface GetFriendActivityParams {
  limit?: number
}

export async function getFriendActivity(
  params: GetFriendActivityParams = {}
): Promise<FriendActivityResponse> {
  const { limit = 5 } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 로그인 필수
  if (!user) {
    return { activities: [], error: null }
  }

  // 팔로잉 목록 조회
  const { data: followings } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  if (!followings || followings.length === 0) {
    return { activities: [], error: null }
  }

  const followingIds = followings.map(f => f.following_id)

  // 활동 로그 조회
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      id,
      action_type,
      content_id,
      metadata,
      created_at,
      user:profiles!activity_logs_user_id_fkey(
        id,
        nickname,
        avatar_url
      )
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('친구 활동 조회 에러:', error)
    return { activities: [], error: error.message }
  }

  if (!data || data.length === 0) {
    return { activities: [], error: null }
  }

  // content_id 목록 추출 후 별도 조회
  const contentIds = [...new Set(
    data.map(item => item.content_id).filter(Boolean)
  )] as string[]

  type ContentInfo = { title: string; thumbnail_url: string | null; type: ContentType }
  let contentsMap: Record<string, ContentInfo> = {}

  if (contentIds.length > 0) {
    const { data: contents } = await supabase
      .from('contents')
      .select(`id, type, content_locales(locale, title, thumbnail_url)`)
      .in('id', contentIds)

    if (contents) {
      contentsMap = Object.fromEntries(
        (contents as ActivityContentRow[]).map(c => {
          const locales = c.content_locales
          const ko = locales?.find(l => l.locale === 'ko')
          const en = locales?.find(l => l.locale === 'en')
          return [
            c.id,
            { title: ko?.title || en?.title || '', thumbnail_url: ko?.thumbnail_url || en?.thumbnail_url || null, type: c.type as ContentType }
          ]
        })
      )
    }
  }

  type UserProfile = { id: string; nickname: string | null; avatar_url: string | null }

  const activities: FriendActivity[] = data.map(item => {
    const userProfile = (Array.isArray(item.user) ? item.user[0] : item.user) as UserProfile | null
    const contentInfo = item.content_id ? contentsMap[item.content_id] : null

    return {
      id: item.id,
      user: {
        id: userProfile?.id || '',
        nickname: userProfile?.nickname || 'User',
        avatar_url: userProfile?.avatar_url || null,
      },
      action_type: item.action_type,
      content: contentInfo ? {
        id: item.content_id as string,
        title: contentInfo.title,
        thumbnail_url: contentInfo.thumbnail_url,
        type: contentInfo.type,
      } : null,
      metadata: (item.metadata as Record<string, unknown>) ?? {},
      created_at: item.created_at,
    }
  })

  return { activities, error: null }
}
