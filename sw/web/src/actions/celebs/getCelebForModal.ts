'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import { NO_ROWS_CODE, STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { CelebProfile, CelebInfluence, CelebTagInfo } from '@/types/home'
import type { Tables } from '@/types/supabase'
import { getCelebLevelByRanking } from '@/constants/materials'
import {
  DIALOGUE_BRIEF_SELECT,
  getDisplayDialogueQuote,
  type DialogueBrief,
} from '@/lib/utils/celeb-dialogues'

// select 문자열과 동일한 필드 집합
type ProfileModalRow = Pick<
  Tables<'celebs'>,
  | 'id' | 'slug' | 'nickname' | 'nickname_en' | 'avatar_url' | 'profession'
  | 'title' | 'title_en'
  | 'nationality' | 'birth_date' | 'death_date' | 'bio' | 'bio_en'
  | 'is_verified' | 'claimed_by_member_id' | 'has_voice' | 'voice_v' | 'voice_speed' | 'celeb_tier'
  | 'publication_status' | 'content_research_confirmed_empty_at'
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
async function fetchCelebModalPublic(
  celebId: string,
  requireActive: boolean,
): Promise<CelebModalPublicData | null> {
  const supabase = createStaticClient()

  // 프로필 조회 (인물 미리보기에 필요한 필드만)
  let profileQuery = supabase
    .from('celebs')
    .select('id, slug, nickname, nickname_en, avatar_url, profession, title, title_en, nationality, birth_date, death_date, bio, bio_en, is_verified, claimed_by_member_id, has_voice, voice_v, voice_speed, celeb_tier, publication_status, content_research_confirmed_empty_at')
    .eq('id', celebId)

  if (requireActive) {
    profileQuery = profileQuery.eq('publication_status', 'active')
  }

  const { data, error } = await profileQuery.single()

  const profile: ProfileModalRow | null = data
  throwOnQueryError('getCelebForModal 프로필', error, { ignoreCodes: [NO_ROWS_CODE] })
  if (!profile) return null

  // 병렬 조회
  const [contentResult, followerResult, influenceResult, tags, dialogueResult] = await Promise.all([
    supabase.from('celeb_contents').select('*', { count: 'exact', head: true }).eq('celeb_id', celebId),
    supabase.from('member_celeb_follows').select('*', { count: 'exact', head: true }).eq('celeb_id', celebId),
    supabase.from('celeb_influence').select('total_score').eq('celeb_id', celebId).maybeSingle(),
    // 세력도감 소속 — 단일 원천은 제작 테이블이고 DB 뷰 faction_atlas_members가 웹 전용 배정과
    // 합쳐 준다. UNION 뷰는 태그 embed가 안 되므로 뷰 → celeb_tags 두 단계로 읽어 합친다.
    (async (): Promise<CelebTagInfo[]> => {
      const { data: memberRows } = await supabase
        .from('faction_atlas_members')
        .select('tag_id, short_desc, short_desc_en, long_desc, long_desc_en')
        .eq('celeb_id', celebId)
        .eq('hidden', false)
        .overrideTypes<{ tag_id: string; short_desc: string | null; short_desc_en: string | null; long_desc: string | null; long_desc_en: string | null }[], { merge: false }>()
      if (!memberRows?.length) return []

      const tagIds = [...new Set(memberRows.map((r) => r.tag_id))]
      const { data: tagRows } = await supabase
        .from('celeb_tags')
        .select('id, name, name_en, color')
        .in('id', tagIds)
        .overrideTypes<{ id: string; name: string; name_en: string | null; color: string }[], { merge: false }>()
      const tagById = new Map((tagRows ?? []).map((t) => [t.id, t]))

      return memberRows.flatMap((r) => {
        const tag = tagById.get(r.tag_id)
        if (!tag) return []
        return [{
          id: tag.id,
          name: tag.name,
          name_en: tag.name_en ?? null,
          color: tag.color,
          short_desc: r.short_desc,
          short_desc_en: r.short_desc_en,
          long_desc: r.long_desc,
          long_desc_en: r.long_desc_en,
        }]
      })
    })(),
    supabase.from('celeb_dialogues').select(DIALOGUE_BRIEF_SELECT).eq('celeb_id', celebId).maybeSingle(),
  ])

  return {
    profile,
    contentCount: resolveCelebContentCount(
      contentResult.count,
      profile.content_research_confirmed_empty_at
    ),
    followerCount: followerResult.count || 0,
    totalScore: influenceResult.data?.total_score ?? null,
    tags,
    dialogue: dialogueResult.data as DialogueBrief | null,
  }
}

const getCelebModalCached = unstable_cache(
  (celebId: string) => fetchCelebModalPublic(celebId, true),
  ['celeb-modal'],
  // celebs·celeb_influence + celeb_contents(서고 수) + faction_atlas_members + celeb_dialogues
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS],
  }
)

/*
 * 팩션은 목록 화면과 달리 배정(hidden=false) 자체가 진열 기준이라 inactive 인물도 포함한다.
 * 임의 inactive 프로필을 여는 우회가 되지 않도록, 요청한 팩션에 실제 배정된 인물만 허용한다.
 */
const getFactionCelebModalCached = unstable_cache(
  async (celebId: string, factionTagId: string) => {
    const supabase = createStaticClient()
    // 단일 원천은 제작 테이블 — 뷰(faction_atlas_members)가 웹 전용 배정과 합쳐 준다
    const { data: assignment, error } = await supabase
      .from('faction_atlas_members')
      .select('celeb_id')
      .eq('celeb_id', celebId)
      .eq('tag_id', factionTagId)
      .eq('hidden', false)
      .maybeSingle()

    if (error) {
      throw new Error(`[getFactionCelebModal] assignment lookup failed: ${error.message}`)
    }
    if (!assignment) return null
    return fetchCelebModalPublic(celebId, false)
  },
  ['faction-celeb-modal'],
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS],
  }
)

export async function getCelebForModal(
  celebId: string,
  factionTagId?: string,
): Promise<CelebProfile | null> {
  const pub = factionTagId
    ? await getFactionCelebModalCached(celebId, factionTagId)
    : await getCelebModalCached(celebId)
  if (!pub) return null

  // 인증 사용자 의존 — 캐시 밖에서 cookie 클라이언트로 조회
  let isFollowing = false

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (currentUser) {
    const followResult = await supabase
      .from('member_celeb_follows')
      .select('id')
      .eq('member_id', currentUser.id)
      .eq('celeb_id', celebId)
      .maybeSingle()
    isFollowing = !!followResult.data
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
    quotes: getDisplayDialogueQuote(dialogue?.quote),
    quotes_en: getDisplayDialogueQuote(dialogue?.quote_en),
    is_verified: profile.is_verified || false,
    is_platform_managed: profile.claimed_by_member_id === null,
    follower_count: pub.followerCount,
    content_count: pub.contentCount,
    is_following: isFollowing,
    // 셀럽은 로그인 회원이 아니므로 회원을 역방향 팔로우할 수 없다.
    is_follower: false,
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
