'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure } from '@/lib/errors'
import { getTitleInfo } from '@/constants/titles'
import type { CelebTier as SharedCelebTier } from '@feelandnote/shared/constants/celeb-tiers'

interface SelectedTitle {
  name: string
  grade: string
}

/**
 * 셀럽 등급. full만 색인 대상이며, fiction은 신화·허구 속 존재다.
 * 정의는 @feelandnote/shared/constants/celeb-tiers가 단일원천이다.
 * ('use server' 파일이라 재export(export type { ... })는 번들러가 런타임 export로 보고 깨진다. 별칭 선언으로 둔다)
 */
export type CelebTier = SharedCelebTier

export interface PublicUserProfile {
  id: string
  slug: string | null
  nickname: string
  nickname_en?: string | null
  nickname_ko?: string | null
  avatar_url: string | null
  bio: string | null
  quotes: string | null
  profession: string | null
  title: string | null
  title_en?: string | null
  title_ko?: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  subject_kind: 'member' | 'celeb'
  is_verified: boolean
  created_at: string
  selected_title: SelectedTitle | null
  stats: {
    content_count: number
    follower_count: number
    following_count: number
    friend_count: number
    guestbook_count: number
  }
  is_following: boolean
  is_follower: boolean
  is_blocked: boolean
  has_voice?: boolean
  voice_v?: number
  voice_speed?: number
  wikidata_qid?: string | null
  celeb_tier?: CelebTier | null
  /** 인물 화면 누적 조회수. 화면 캐시를 타므로 낡을 수 있고, 실제 값은 조회 반영 함수가 돌려준다. */
  view_count?: number
  monologue?: string | null
  virtual_monologue?: string | null
  youtube_videos?: Record<string, { videoId: string; uploadedAt: string }> | null
}

// React.cache로 같은 RSC 요청(generateMetadata + default export 등) 안의 중복 호출 dedup
export const getUserProfile = cache(getUserProfileInner)

async function getUserProfileInner(userId: string): Promise<ActionResult<PublicUserProfile>> {
  const supabase = await createClient()
  const [authResult, profileResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('member_profiles')
      .select('id, nickname, avatar_url, bio, nationality, birth_date, is_verified, created_at, selected_title')
      .eq('id', userId)
      .single(),
  ])
  const currentUser = authResult.data.user
  const { data: profile, error: profileError } = profileResult

  if (profileError || !profile) {
    return failure('NOT_FOUND', '사용자를 찾을 수 없다.')
  }

  const [socialResult, guestbookResult] = await Promise.all([
    supabase
      .from('member_social_stats')
      .select('content_count, follower_count, following_count, friend_count')
      .eq('member_id', userId)
      .maybeSingle(),
    supabase
      .from('member_guestbook_entries')
      .select('id', { count: 'exact', head: true })
      .eq('owner_member_id', userId),
  ])

  let isFollowing = false
  let isFollower = false
  let isBlocked = false

  if (currentUser && currentUser.id !== userId) {
    const [followingResult, followerResult, blockResult] = await Promise.all([
      supabase
        .from('member_member_follows')
        .select('id')
        .eq('follower_member_id', currentUser.id)
        .eq('followed_member_id', userId)
        .maybeSingle(),
      supabase
        .from('member_member_follows')
        .select('id')
        .eq('follower_member_id', userId)
        .eq('followed_member_id', currentUser.id)
        .maybeSingle(),
      supabase
        .from('blocks')
        .select('id')
        .in('blocker_id', [currentUser.id, userId])
        .in('blocked_id', [currentUser.id, userId])
        .limit(1)
        .maybeSingle(),
    ])
    isFollowing = !!followingResult.data
    isFollower = !!followerResult.data
    isBlocked = !!blockResult.data
  }

  const selectedTitle = getTitleInfo(profile.selected_title)
  const social = socialResult.data

  return {
    success: true,
    data: {
      id: profile.id,
      slug: null,
      nickname: profile.nickname || 'User',
      nickname_en: null,
      nickname_ko: profile.nickname || 'User',
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      quotes: null,
      profession: null,
      title: null,
      title_en: null,
      title_ko: null,
      nationality: profile.nationality,
      birth_date: profile.birth_date,
      death_date: null,
      subject_kind: 'member',
      is_verified: profile.is_verified || false,
      created_at: profile.created_at,
      selected_title: selectedTitle,
      stats: {
        content_count: social?.content_count || 0,
        follower_count: social?.follower_count || 0,
        following_count: social?.following_count || 0,
        friend_count: social?.friend_count || 0,
        guestbook_count: guestbookResult.count || 0,
      },
      is_following: isFollowing,
      is_follower: isFollower,
      is_blocked: isBlocked,
    },
  }
}
