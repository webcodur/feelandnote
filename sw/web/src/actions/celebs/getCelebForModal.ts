'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { CelebProfile, CelebInfluence, CelebTagInfo } from '@/types/home'
import type { Tables } from '@/types/supabase'
import { getCelebLevelByRanking } from '@/constants/materials'
import { DIALOGUE_BRIEF_SELECT, type DialogueBrief } from '@/lib/utils/celeb-dialogues'

// select 문자열과 동일한 필드 집합
type ProfileModalRow = Pick<
  Tables<'profiles'>,
  | 'id' | 'slug' | 'nickname' | 'nickname_en' | 'avatar_url' | 'profession'
  | 'title' | 'title_en'
  | 'nationality' | 'birth_date' | 'death_date' | 'bio' | 'bio_en'
  | 'is_verified' | 'claimed_by' | 'has_voice' | 'voice_v' | 'voice_speed' | 'celeb_tier'
  | 'content_research_status'
>

// 캐시되는 공개 데이터 묶음 (인증 비의존)
interface CelebModalPublicData {
  profile: ProfileModalRow
  contentCount: number
  followerCount: number
  totalScore: number | null
  tags: CelebTagInfo[]
  dialogue: DialogueBrief | null
}

// 공개 테이블만 조회 — anon 클라이언트로 캐시 가능
async function fetchCelebModalPublic(celebId: string): Promise<CelebModalPublicData | null> {
  const supabase = createStaticClient()

  // 프로필 조회 (인물 미리보기에 필요한 필드만)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, profession, title, title_en, nationality, birth_date, death_date, bio, bio_en, is_verified, claimed_by, has_voice, voice_v, voice_speed, celeb_tier, content_research_status')
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .single()

  const profile: ProfileModalRow | null = data
  if (error || !profile) return null

  // 병렬 조회
  const [contentResult, followerResult, influenceResult, tagsResult, dialogueResult] = await Promise.all([
    supabase.from('user_contents').select('*', { count: 'exact', head: true }).eq('user_id', celebId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', celebId),
    supabase.from('celeb_influence').select('total_score').eq('celeb_id', celebId).maybeSingle(),
    supabase
      .from('celeb_tag_assignments')
      .select('short_desc, short_desc_en, long_desc, long_desc_en, tag:celeb_tags(id, name, name_en, color)')
      .eq('celeb_id', celebId),
    supabase.from('celeb_dialogues').select(DIALOGUE_BRIEF_SELECT).eq('celeb_id', celebId).maybeSingle(),
  ])

  // 태그 정보 변환
  const tags: CelebTagInfo[] = (tagsResult.data || [])
    .filter((t): t is typeof t & { tag: { id: string; name: string; name_en: string | null; color: string } } => t.tag !== null)
    .map((t) => ({
      id: (t.tag as { id: string }).id,
      name: (t.tag as { name: string }).name,
      name_en: (t.tag as { name_en: string | null }).name_en ?? null,
      color: (t.tag as { color: string }).color,
      short_desc: t.short_desc,
      short_desc_en: t.short_desc_en,
      long_desc: t.long_desc,
      long_desc_en: t.long_desc_en,
    }))

  return {
    profile,
    contentCount: resolveCelebContentCount(
      contentResult.count,
      profile.content_research_status
    ),
    followerCount: followerResult.count || 0,
    totalScore: influenceResult.data?.total_score ?? null,
    // JSON path 추출 컬럼은 Json으로 추론되므로 실제 형태로 교정
    tags,
    dialogue: dialogueResult.data as DialogueBrief | null,
  }
}

const getCelebModalCached = unstable_cache(
  fetchCelebModalPublic,
  ['celeb-modal'],
  // profiles·celeb_influence + user_contents(서고 수) + celeb_tag_assignments + celeb_dialogues
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS],
  }
)

export async function getCelebForModal(celebId: string): Promise<CelebProfile | null> {
  const pub = await getCelebModalCached(celebId)
  if (!pub) return null

  // 인증 사용자 의존 — 캐시 밖에서 cookie 클라이언트로 조회
  let isFollowing = false
  let isFollower = false

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (currentUser) {
    const [followResult, followerCheck] = await Promise.all([
      supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', celebId).single(),
      supabase.from('follows').select('id').eq('follower_id', celebId).eq('following_id', currentUser.id).single(),
    ])
    isFollowing = !!followResult.data
    isFollower = !!followerCheck.data
  }

  const { profile, dialogue } = pub

  // 영향력 정보 (total_score만 사용, level은 placeholder)
  const influence: CelebInfluence | null = pub.totalScore
    ? {
        total_score: pub.totalScore,
        level: getCelebLevelByRanking(1, 1), // placeholder - 실제 aura는 getAuraByScore로 계산됨
        ranking: undefined,
        percentile: undefined,
      }
    : null

  return {
    id: profile.id,
    slug: profile.slug ?? null,
    nickname: profile.nickname || '익명',
    nickname_en: profile.nickname_en ?? null,
    avatar_url: profile.avatar_url,
    profession: profile.profession,
    title: profile.title,
    title_en: profile.title_en ?? null,
    nationality: profile.nationality,
    birth_date: profile.birth_date,
    death_date: profile.death_date,
    bio: profile.bio,
    bio_en: profile.bio_en ?? null,
    quotes: dialogue?.quote ?? null,
    quotes_en: dialogue?.quote_en ?? null,
    is_verified: profile.is_verified || false,
    is_platform_managed: profile.claimed_by === null,
    follower_count: pub.followerCount,
    content_count: pub.contentCount,
    is_following: isFollowing,
    is_follower: isFollower,
    influence,
    tags: pub.tags,
    greeting: dialogue?.greeting ?? null,
    greeting_en: dialogue?.greeting_en ?? null,
    has_voice: profile.has_voice ?? false,
    voice_v: profile.voice_v ?? 0,
    voice_speed: profile.voice_speed ?? 1.0,
    celeb_tier: (profile.celeb_tier as 'full' | 'light') ?? 'full',
  }
}
