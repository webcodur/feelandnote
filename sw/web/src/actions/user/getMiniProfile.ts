'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { type ActionResult, failure } from '@/lib/errors'
import { getTitleInfo } from '@/constants/titles'

export interface MiniProfile {
  id: string
  nickname: string
  avatar_url: string | null
  selected_title: { name: string; grade: string } | null
  content_count: number
  follower_count: number
  is_following: boolean
  is_self: boolean
}

interface PublicMiniProfileData {
  profile: { id: string; nickname: string | null; avatar_url: string | null; selected_title: string | null } | null
  contentCount: number
  followerCount: number
}

// 공개 데이터(profiles·user_contents·follows)만 조회 — viewer 무관, 캐시 가능
async function fetchMiniProfilePublic(userId: string): Promise<PublicMiniProfileData> {
  const supabase = createStaticClient()

  const [profileResult, contentResult, followerResult] = await Promise.all([
    supabase.from('profiles').select('id, nickname, avatar_url, selected_title').eq('id', userId).single(),
    supabase.from('user_contents').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
  ])

  return {
    profile: (profileResult.data as PublicMiniProfileData['profile']) ?? null,
    contentCount: contentResult.count || 0,
    followerCount: followerResult.count || 0,
  }
}

const getMiniProfilePublicCached = unstable_cache(
  fetchMiniProfilePublic,
  ['mini-profile'],
  // profiles(셀럽도 대상) + user_contents 수
  { revalidate: 3600, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getMiniProfile(userId: string): Promise<ActionResult<MiniProfile>> {
  const pub = await getMiniProfilePublicCached(userId)

  if (!pub.profile) {
    return failure('NOT_FOUND', '사용자를 찾을 수 없다.')
  }

  // viewer 의존: 본인 여부·팔로우 여부 (캐시 불가)
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  let isFollowing = false
  if (currentUser && currentUser.id !== userId) {
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .single()
    isFollowing = !!followData
  }

  return {
    success: true,
    data: {
      id: pub.profile.id,
      nickname: pub.profile.nickname || '익명',
      avatar_url: pub.profile.avatar_url,
      selected_title: getTitleInfo(pub.profile.selected_title),
      content_count: pub.contentCount,
      follower_count: pub.followerCount,
      is_following: isFollowing,
      is_self: currentUser?.id === userId,
    },
  }
}
