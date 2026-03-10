'use server'

import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure } from '@/lib/errors'
import { type PublicUserProfile, type SelectedTitle } from './getUserProfile'
import { getTitleInfo } from '@/constants/titles'

export interface ContentTypeCounts {
  BOOK: number
  VIDEO: number
  GAME: number
  MUSIC: number
}

export async function getCelebBySlug(
  slug: string,
  locale: string = 'ko'
): Promise<ActionResult<PublicUserProfile & { contentTypeCounts: ContentTypeCounts }>> {
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, bio, bio_en, quotes, quotes_en, profession, title, title_en, consumption_philosophy, consumption_philosophy_en, nationality, birth_date, death_date, profile_type, is_verified, created_at, selected_title, has_voice, voice_v, wikidata_qid')
    .eq('slug', slug)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .single()

  if (profileError || !profile) {
    return failure('NOT_FOUND', '셀럽을 찾을 수 없다.')
  }

  const userId = profile.id

  // 콘텐츠 수 + 타입별 카운트를 병렬 조회
  const [
    contentCountResult,
    typeCountsResult,
    followerResult,
    guestbookResult,
    dialogueResult,
  ] = await Promise.all([
    supabase
      .from('user_contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('user_contents')
      .select('content_id, contents!inner(type)')
      .eq('user_id', userId) as unknown as Promise<{ data: Array<{ contents: { type: string } }> | null }>,
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact' })
      .eq('following_id', userId),
    supabase
      .from('guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId),
    supabase
      .from('celeb_dialogues')
      .select('lines, lines_en')
      .eq('celeb_id', userId)
      .maybeSingle(),
  ])

  // 타입별 카운트 집계
  const contentTypeCounts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
  if (typeCountsResult.data) {
    for (const row of typeCountsResult.data) {
      const type = (row.contents as unknown as { type: string })?.type as keyof ContentTypeCounts
      if (type && type in contentTypeCounts) {
        contentTypeCounts[type]++
      }
    }
  }

  // 팔로우 상태
  let isFollowing = false
  let isFollower = false
  let isBlocked = false

  if (currentUser && currentUser.id !== userId) {
    const [followingData, followerData, blockData] = await Promise.all([
      supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).single(),
      supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', currentUser.id).single(),
      supabase.from('blocks').select('id')
        .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
        .single(),
    ])
    isFollowing = !!followingData.data
    isFollower = !!followerData.data
    isBlocked = !!blockData.data
  }

  const selectedTitle = getTitleInfo(profile.selected_title)

  const isEn = locale === 'en'
  const resolve = <T,>(en: T | null | undefined, ko: T): T =>
    isEn && en ? en : ko

  return {
    success: true,
    data: {
      id: profile.id,
      slug: profile.slug ?? null,
      nickname: resolve(profile.nickname_en, profile.nickname || 'Unknown'),
      nickname_en: profile.nickname_en,
      nickname_ko: profile.nickname || 'Unknown',
      avatar_url: profile.avatar_url,
      bio: resolve(profile.bio_en, profile.bio),
      quotes: resolve(
        (dialogueResult.data?.lines_en as Record<string, any> | null)?.quote ?? profile.quotes_en,
        (dialogueResult.data?.lines as Record<string, any> | null)?.quote ?? profile.quotes
      ),
      profession: profile.profession,
      title: resolve(profile.title_en, profile.title),
      title_en: profile.title_en,
      title_ko: profile.title,
      consumption_philosophy: resolve(profile.consumption_philosophy_en, profile.consumption_philosophy),
      nationality: profile.nationality,
      birth_date: profile.birth_date,
      death_date: profile.death_date,
      profile_type: 'CELEB',
      is_verified: profile.is_verified || false,
      created_at: profile.created_at,
      selected_title: selectedTitle,
      stats: {
        content_count: contentCountResult.count || 0,
        follower_count: followerResult.count || 0,
        following_count: 0,
        friend_count: 0,
        guestbook_count: guestbookResult.count || 0,
      },
      is_following: isFollowing,
      is_follower: isFollower,
      is_blocked: isBlocked,
      has_voice: profile.has_voice ?? false,
      voice_v: (profile as Record<string, unknown>).voice_v as number ?? 0,
      wikidata_qid: (profile as Record<string, unknown>).wikidata_qid as string | null ?? null,
      contentTypeCounts,
    },
  }
}
