'use server'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { type ActionResult, failure } from '@/lib/errors'
import { type PublicUserProfile, type CelebTier } from './getUserProfile'
import { getTitleInfo } from '@/constants/titles'
import { DIALOGUE_PROFILE_SELECT, type DialogueProfile } from '@/lib/utils/celeb-dialogues'

export interface ContentTypeCounts {
  BOOK: number
  VIDEO: number
  GAME: number
  MUSIC: number
}

const CONTENT_TYPES: Array<keyof ContentTypeCounts> = ['BOOK', 'VIDEO', 'GAME', 'MUSIC']

interface PublicCelebBySlugData {
  profile: {
    id: string
    slug: string | null
    nickname: string | null
    nickname_en: string | null
    avatar_url: string | null
    bio: string | null
    bio_en: string | null
    profession: string | null
    title: string | null
    title_en: string | null
    cultural_journey: string | null
    cultural_journey_en: string | null
    virtual_monologue: string | null
    nationality: string | null
    birth_date: string | null
    death_date: string | null
    is_verified: boolean | null
    created_at: string
    selected_title: string | null
    has_voice: boolean | null
    voice_v: number | null
    voice_speed: number | null
    wikidata_qid: string | null
    celeb_tier: string | null
    youtube_videos: Record<string, { videoId: string; uploadedAt: string }> | null
  }
  contentCount: number
  followerCount: number
  guestbookCount: number
  contentTypeCounts: ContentTypeCounts
  dialogue: DialogueProfile | null
}

async function fetchCelebBySlugPublic(slug: string): Promise<PublicCelebBySlugData | null> {
  const supabase = createStaticClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, bio, bio_en, profession, title, title_en, cultural_journey, cultural_journey_en, virtual_monologue, nationality, birth_date, death_date, is_verified, created_at, selected_title, has_voice, voice_v, voice_speed, wikidata_qid, celeb_tier, youtube_videos')
    .eq('slug', slug)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .single()

  if (!profile) return null

  const userId = profile.id as string

  // 카운트 쿼리는 head:true count:'exact' 로 row 송출 0, 타입별 카운트는 RPC 1회로 수신
  const [
    contentCountResult,
    followerResult,
    guestbookResult,
    dialogueResult,
    typeCountsResult,
  ] = await Promise.all([
    supabase
      .from('user_contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId),
    supabase
      .from('celeb_dialogues')
      .select(DIALOGUE_PROFILE_SELECT)
      .eq('celeb_id', userId)
      .maybeSingle(),
    supabase.rpc('get_celeb_type_counts', { p_user_id: userId }),
  ])

  const contentTypeCounts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
  for (const row of typeCountsResult.data ?? []) {
    const type = row.content_type as keyof ContentTypeCounts
    if (CONTENT_TYPES.includes(type)) contentTypeCounts[type] = Number(row.total)
  }

  return {
    profile: profile as PublicCelebBySlugData['profile'],
    contentCount: contentCountResult.count || 0,
    followerCount: followerResult.count || 0,
    guestbookCount: guestbookResult.count || 0,
    contentTypeCounts,
    dialogue: (dialogueResult.data as unknown as DialogueProfile | null) ?? null,
  }
}

const getCelebBySlugCached = unstable_cache(
  fetchCelebBySlugPublic,
  ['celeb-by-slug'],
  // profiles(셀럽 본체) + user_contents(서고 수) + celeb_dialogues
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES] }
)

// React.cache로 같은 RSC 요청(generateMetadata + default export 등) 안의 중복 호출 dedup
export const getCelebBySlug = cache(getCelebBySlugInner);

async function getCelebBySlugInner(
  slug: string,
  locale: string = 'ko'
): Promise<ActionResult<PublicUserProfile & { contentTypeCounts: ContentTypeCounts }>> {
  const pub = await getCelebBySlugCached(slug)

  if (!pub) {
    return failure('NOT_FOUND', '셀럽을 찾을 수 없다.')
  }

  // 동적 데이터 — 인증 사용자 의존이라 캐시 불가
  let isFollowing = false
  let isFollower = false
  let isBlocked = false

  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (currentUser && currentUser.id !== pub.profile.id) {
      const [followingData, followerData, blockData] = await Promise.all([
        supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', pub.profile.id).maybeSingle(),
        supabase.from('follows').select('id').eq('follower_id', pub.profile.id).eq('following_id', currentUser.id).maybeSingle(),
        supabase.from('blocks').select('id')
          .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)
          .or(`blocker_id.eq.${pub.profile.id},blocked_id.eq.${pub.profile.id}`)
          .maybeSingle(),
      ])
      isFollowing = !!followingData.data
      isFollower = !!followerData.data
      isBlocked = !!blockData.data
    }
  } catch {
    // 캐시 컨텍스트 외 호출 실패 시 무시
  }

  const profile = pub.profile
  const selectedTitle = getTitleInfo(profile.selected_title)

  const isEn = locale === 'en'
  const resolve = <T,>(en: T | null | undefined, ko: T): T =>
    isEn && en ? en : ko

  const d = pub.dialogue

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
      quotes: resolve(d?.quote_en ?? null, d?.quote ?? null),
      monologue: resolve(d?.monologue_en ?? null, d?.monologue ?? null),
      profession: profile.profession,
      title: resolve(profile.title_en, profile.title),
      title_en: profile.title_en,
      title_ko: profile.title,
      cultural_journey: resolve(profile.cultural_journey_en, profile.cultural_journey),
      virtual_monologue: profile.virtual_monologue,
      nationality: profile.nationality,
      birth_date: profile.birth_date,
      death_date: profile.death_date,
      profile_type: 'CELEB',
      is_verified: profile.is_verified || false,
      created_at: profile.created_at,
      selected_title: selectedTitle,
      stats: {
        content_count: pub.contentCount,
        follower_count: pub.followerCount,
        following_count: 0,
        friend_count: 0,
        guestbook_count: pub.guestbookCount,
      },
      is_following: isFollowing,
      is_follower: isFollower,
      is_blocked: isBlocked,
      has_voice: profile.has_voice ?? false,
      voice_v: profile.voice_v ?? 0,
      voice_speed: profile.voice_speed ?? 1.0,
      wikidata_qid: profile.wikidata_qid ?? null,
      celeb_tier: ((profile.celeb_tier as CelebTier) ?? 'full'),
      youtube_videos: profile.youtube_videos ?? null,
      contentTypeCounts: pub.contentTypeCounts,
    },
  }
}
