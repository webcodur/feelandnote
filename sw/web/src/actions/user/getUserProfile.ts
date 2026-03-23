'use server'

import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure } from '@/lib/errors'
import { getTitleInfo } from '@/constants/titles'
import { getLocale } from 'next-intl/server'

export interface SelectedTitle {
  name: string
  grade: string
}

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
  cultural_journey: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  profile_type: 'USER' | 'CELEB'
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
  celeb_tier?: 'full' | 'light' | null
}

export async function getUserProfile(userId: string): Promise<ActionResult<PublicUserProfile>> {
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, bio, bio_en, profession, title, title_en, cultural_journey, cultural_journey_en, nationality, birth_date, death_date, profile_type, is_verified, created_at, selected_title')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return failure('NOT_FOUND', '사용자를 찾을 수 없다.')
  }

  const { count: contentCount } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const [followerResult, followingResult] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact' }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact' }).eq('follower_id', userId),
  ])

  let friendCount = 0
  if (followingResult.data && followingResult.data.length > 0) {
    const targetFollowingIds = followingResult.data.map(f => f.following_id)
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
      .in('follower_id', targetFollowingIds)
    friendCount = count || 0
  }

  const { count: guestbookCount } = await supabase
    .from('guestbook_entries')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', userId)

  let isFollowing = false
  let isFollower = false
  let isBlocked = false

  if (currentUser && currentUser.id !== userId) {
    const { data: followingData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .single()
    isFollowing = !!followingData

    const { data: followerData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', currentUser.id)
      .single()
    isFollower = !!followerData

    const { data: blockData } = await supabase
      .from('blocks')
      .select('id')
      .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
      .single()
    isBlocked = !!blockData
  }

  const selectedTitle = getTitleInfo(profile.selected_title)

  // 셀럽인 경우 celeb_dialogues에서 quote 조회
  let dialogueQuote: string | null = null
  let dialogueQuoteEn: string | null = null
  if (profile.profile_type === 'CELEB') {
    const { data: dlg } = await supabase
      .from('celeb_dialogues')
      .select('lines, lines_en')
      .eq('celeb_id', userId)
      .maybeSingle()
    dialogueQuote = (dlg?.lines as Record<string, any> | null)?.quote ?? null
    dialogueQuoteEn = (dlg?.lines_en as Record<string, any> | null)?.quote ?? null
  }

  const locale = await getLocale()
  const isEn = locale === 'en'
  const resolve = <T,>(en: T | null | undefined, ko: T): T =>
    isEn && en ? en : ko

  return {
    success: true,
    data: {
      id: profile.id,
      slug: profile.slug ?? null,
      nickname: resolve(profile.nickname_en, profile.nickname || 'User'),
      nickname_en: profile.nickname_en,
      nickname_ko: profile.nickname || 'User',
      avatar_url: profile.avatar_url,
      bio: resolve(profile.bio_en, profile.bio),
      quotes: profile.profile_type === 'CELEB'
        ? resolve(dialogueQuoteEn, dialogueQuote)
        : null,
      profession: profile.profession,
      title: resolve(profile.title_en, profile.title),
      title_en: profile.title_en,
      title_ko: profile.title,
      cultural_journey: resolve(profile.cultural_journey_en, profile.cultural_journey),
      nationality: profile.nationality,
      birth_date: profile.birth_date,
      death_date: profile.death_date,
      profile_type: (profile.profile_type as 'USER' | 'CELEB') || 'USER',
      is_verified: profile.is_verified || false,
      created_at: profile.created_at,
      selected_title: selectedTitle,
      stats: {
        content_count: contentCount || 0,
        follower_count: followerResult.count || 0,
        following_count: followingResult.count || 0,
        friend_count: friendCount,
        guestbook_count: guestbookCount || 0,
      },
      is_following: isFollowing,
      is_follower: isFollower,
      is_blocked: isBlocked,
    },
  }
}
