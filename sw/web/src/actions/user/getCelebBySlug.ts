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

// 셀럽이 배정된 스포트라이트 태그. 그룹 헤더 태그는 배정이 0이라 여기 걸리지 않으므로
// 상위 그룹 계층(constants/spotlightGroups)은 참조하지 않는다.
export interface SpotlightTagItem {
  id: string
  name: string
  name_en: string | null
  slug: string
  color: string
  spotlightImageUrl: string | null
  description: string | null
  description_en: string | null
  roleShort: string | null
  roleShortEn: string | null
  roleLong: string | null
  roleLongEn: string | null
}

interface SpotlightTagAssignmentRow {
  tag_id: string
  spotlight_image_url: string | null
  sort_order: number | null
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  tag: {
    id: string
    name: string
    name_en: string | null
    slug: string | null
    color: string | null
    description: string | null
    description_en: string | null
  } | null
}

// 인물 관계망 한 줄 = "이 인물(target)이 페이지 주인에게 무엇인가"(relType).
// 방향 규약·수집은 sw/web-bo/scripts/sync-celeb-relations.ts (위키데이터 사실 관계만, 창작 없음)
export interface CelebRelationItem {
  relType: string
  relGroup: 'family' | 'thought' | 'rivalry' | 'career'
  id: string
  /** null이면 명단 밖 인물(위키데이터 등재) — 페이지가 없어 이름 노드로만 띄운다 */
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  /** 관계의 근거 한 줄(사건·시기). 수동 수록 라이벌에만 있다 */
  note: string | null
}

interface CelebRelationRow {
  rel_type: string
  rel_group: 'family' | 'thought' | 'rivalry' | 'career'
  note: string | null
  target: {
    id: string
    slug: string | null
    nickname: string | null
    nickname_en: string | null
    avatar_url: string | null
    profession: string | null
    status: string | null
  } | null
}

// 표시 순서: 혈연 → 사상 → 대립, 그 안에서 가까운 관계부터
const REL_TYPE_ORDER = ['father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative', 'teacher', 'student', 'influence', 'influenced', 'cofounder', 'rival']

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
    virtual_monologue_en: string | null
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
  spotlightTags: SpotlightTagItem[]
  relations: CelebRelationItem[]
}

async function fetchCelebBySlugPublic(slug: string): Promise<PublicCelebBySlugData | null> {
  const supabase = createStaticClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, bio, bio_en, profession, title, title_en, cultural_journey, cultural_journey_en, virtual_monologue, virtual_monologue_en, nationality, birth_date, death_date, is_verified, created_at, selected_title, has_voice, voice_v, voice_speed, wikidata_qid, celeb_tier, youtube_videos')
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
    spotlightTagsResult,
    relationsResult,
    externalRelationsResult,
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
    supabase
      .from('celeb_tag_assignments')
      .select('tag_id, spotlight_image_url, sort_order, short_desc, short_desc_en, long_desc, long_desc_en, tag:celeb_tags(id, name, name_en, slug, color, description, description_en)')
      .eq('celeb_id', userId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('celeb_relations')
      .select('rel_type, rel_group, note, target:profiles!celeb_relations_to_id_fkey(id, slug, nickname, nickname_en, avatar_url, profession, status)')
      .eq('from_id', userId),
    supabase
      .from('celeb_relations_external')
      .select('rel_type, rel_group, qid, name_ko, name_en, image_url')
      .eq('from_id', userId),
  ])

  const contentTypeCounts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
  for (const row of typeCountsResult.data ?? []) {
    const type = row.content_type as keyof ContentTypeCounts
    if (CONTENT_TYPES.includes(type)) contentTypeCounts[type] = Number(row.total)
  }

  // 슬러그 없는 태그는 스포트라이트 딥링크로 이동할 수 없어 제외한다
  const spotlightTags: SpotlightTagItem[] = ((spotlightTagsResult.data ?? []) as unknown as SpotlightTagAssignmentRow[])
    .filter((a): a is SpotlightTagAssignmentRow & { tag: NonNullable<SpotlightTagAssignmentRow['tag']> } => !!a.tag?.slug)
    .map((a) => ({
      id: a.tag.id,
      name: a.tag.name,
      name_en: a.tag.name_en,
      slug: a.tag.slug as string,
      color: a.tag.color ?? '#b4965a',
      spotlightImageUrl: a.spotlight_image_url ?? null,
      description: a.tag.description ?? null,
      description_en: a.tag.description_en ?? null,
      roleShort: a.short_desc ?? null,
      roleShortEn: a.short_desc_en ?? null,
      roleLong: a.long_desc ?? null,
      roleLongEn: a.long_desc_en ?? null,
    }))

  // 비활성·슬러그 없는 상대는 이동할 곳이 없으므로 제외한다
  const internalRelations: CelebRelationItem[] = ((relationsResult.data ?? []) as unknown as CelebRelationRow[])
    .filter((r): r is CelebRelationRow & { target: NonNullable<CelebRelationRow['target']> } =>
      !!r.target?.slug && r.target.status === 'active')
    .map((r) => ({
      relType: r.rel_type,
      relGroup: r.rel_group,
      id: r.target.id,
      slug: r.target.slug as string,
      nickname: r.target.nickname || 'Unknown',
      nickname_en: r.target.nickname_en,
      avatar_url: r.target.avatar_url,
      profession: r.target.profession,
      note: r.note,
    }))

  // 명단 밖 인물(위키데이터 등재) — 이름 노드. 셀럽이 자리를 먼저 차지하도록 뒤에 붙인다
  const externalRelations: CelebRelationItem[] = ((externalRelationsResult.data ?? []) as unknown as
    { rel_type: string; rel_group: CelebRelationItem['relGroup']; qid: string; name_ko: string | null; name_en: string | null; image_url: string | null }[])
    .filter((r) => r.name_ko || r.name_en)
    .map((r) => ({
      relType: r.rel_type,
      relGroup: r.rel_group,
      id: `ext-${r.qid}`,
      slug: null,
      nickname: r.name_ko || (r.name_en as string),
      nickname_en: r.name_en,
      avatar_url: r.image_url,
      profession: null,
      note: null,
    }))

  const byTypeThenName = (a: CelebRelationItem, b: CelebRelationItem) =>
    REL_TYPE_ORDER.indexOf(a.relType) - REL_TYPE_ORDER.indexOf(b.relType)
    || a.nickname.localeCompare(b.nickname)
  const relations = [...internalRelations.sort(byTypeThenName), ...externalRelations.sort(byTypeThenName)]

  return {
    profile: profile as PublicCelebBySlugData['profile'],
    contentCount: contentCountResult.count || 0,
    followerCount: followerResult.count || 0,
    guestbookCount: guestbookResult.count || 0,
    contentTypeCounts,
    dialogue: (dialogueResult.data as unknown as DialogueProfile | null) ?? null,
    spotlightTags,
    relations,
  }
}

const getCelebBySlugCached = unstable_cache(
  fetchCelebBySlugPublic,
  ['celeb-by-slug'],
  // profiles(셀럽 본체) + user_contents(서고 수) + celeb_dialogues + celeb_tag_assignments(소속 스포트라이트)
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS] }
)

// React.cache로 같은 RSC 요청(generateMetadata + default export 등) 안의 중복 호출 dedup
export const getCelebBySlug = cache(getCelebBySlugInner);

async function getCelebBySlugInner(
  slug: string,
  locale: string = 'ko'
): Promise<ActionResult<PublicUserProfile & { contentTypeCounts: ContentTypeCounts; spotlightTags: SpotlightTagItem[]; relations: CelebRelationItem[] }>> {
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
      virtual_monologue: resolve(profile.virtual_monologue_en, profile.virtual_monologue),
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
      // 배포 전에 만들어진 캐시 항목에는 이 필드가 없다 — 빈 배열로 대체해 화면 오류를 막는다
      spotlightTags: pub.spotlightTags ?? [],
      relations: pub.relations ?? [],
    },
  }
}
