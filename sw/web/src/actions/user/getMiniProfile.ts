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

// 공개 회원 프로필과 파생 지표만 조회 — viewer 무관, 캐시 가능
async function fetchMiniProfilePublic(userId: string): Promise<PublicMiniProfileData> {
  const supabase = createStaticClient()

  const [profileResult, socialResult] = await Promise.all([
    supabase.from('member_profiles').select('id, nickname, avatar_url, selected_title').eq('id', userId).single(),
    supabase
      .from('member_social_stats')
      .select('content_count, follower_count')
      .eq('member_id', userId)
      .maybeSingle(),
  ])

  return {
    profile: (profileResult.data as PublicMiniProfileData['profile']) ?? null,
    contentCount: socialResult.data?.content_count || 0,
    followerCount: socialResult.data?.follower_count || 0,
  }
}

const getMiniProfilePublicCached = unstable_cache(
  fetchMiniProfilePublic,
  ['mini-profile'],
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS] }
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
      .from('member_member_follows')
      .select('id')
      .eq('follower_member_id', currentUser.id)
      .eq('followed_member_id', userId)
      .maybeSingle()
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
