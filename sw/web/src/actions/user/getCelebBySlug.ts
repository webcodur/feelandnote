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
import { toFactionMusic, toFactionVideos, type FactionMusic, type FactionVideos } from '@/lib/faction-videos'

export interface ContentTypeCounts {
  BOOK: number
  VIDEO: number
  GAME: number
  MUSIC: number
}

const CONTENT_TYPES: Array<keyof ContentTypeCounts> = ['BOOK', 'VIDEO', 'GAME', 'MUSIC']

// 셀럽이 배정된 세력도감 태그. 그룹 헤더 태그는 배정이 0이라 여기 걸리지 않으므로
// 상위 그룹 계층(celeb_tags.parent_id)은 참조하지 않는다.
export interface FactionTagItem {
  id: string
  name: string
  name_en: string | null
  slug: string
  color: string
  factionImageUrl: string | null
  description: string | null
  description_en: string | null
  roleShort: string | null
  roleShortEn: string | null
  roleLong: string | null
  roleLongEn: string | null
  /** 이 테마를 다룬 세력도 영상(긴 영상·짧은 영상). 둘 다 없으면 null */
  videos: FactionVideos | null
  /** 이 테마 구간에 흐르는 배경음악. 없으면 null */
  music: FactionMusic | null
}

interface FactionTagAssignmentRow {
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
    youtube_videos: unknown
    theme_music: unknown
  } | null
}

// 인물 관계망 한 줄 = "이 인물(target)이 페이지 주인에게 무엇인가"(relType).
// 방향 규약·수집은 sw/web-bo/scripts/sync-celeb-relations.ts (위키데이터 사실 관계만, 창작 없음)
export interface CelebRelationItem {
  relType: string
  relGroup: 'family' | 'thought' | 'rivalry' | 'career' | 'friendship'
  id: string
  /** null이면 명단 밖 인물(위키데이터 등재) — 페이지가 없어 이름 노드로만 띄운다 */
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  /** 명단 밖 인물의 위키데이터 항목 — 상세 카드에서 원본 연결에 쓴다 */
  qid: string | null
  /** 관계의 근거 한 줄(사건·시기). 수동 수록 라이벌·공동 창업에 있다 */
  note: string | null
  /** 근거 한 줄의 영문본. 캐시가 언어를 안 타므로 둘 다 내리고 화면에서 고른다 */
  note_en: string | null
}

interface CelebRelationRow {
  rel_type: string
  rel_group: 'family' | 'thought' | 'rivalry' | 'career' | 'friendship'
  note: string | null
  note_en: string | null
  target: {
    id: string
    slug: string | null
    nickname: string | null
    nickname_en: string | null
    avatar_url: string | null
    profession: string | null
    nationality: string | null
    birth_date: string | null
    death_date: string | null
    status: string | null
    wikidata_qid: string | null
  } | null
}

// 표시 순서: 혈연 → 사상 → 대립, 그 안에서 가까운 관계부터
const REL_TYPE_ORDER = ['father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative', 'teacher', 'student', 'influence', 'influenced', 'cofounder', 'friend', 'rival']

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
    view_count: number | null
    youtube_videos: Record<string, { videoId: string; uploadedAt: string }> | null
  }
  contentCount: number
  followerCount: number
  guestbookCount: number
  contentTypeCounts: ContentTypeCounts
  dialogue: DialogueProfile | null
  factionTags: FactionTagItem[]
  relations: CelebRelationItem[]
}

async function fetchCelebBySlugPublic(slug: string): Promise<PublicCelebBySlugData | null> {
  const supabase = createStaticClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, bio, bio_en, profession, title, title_en, virtual_monologue, virtual_monologue_en, nationality, birth_date, death_date, is_verified, created_at, selected_title, has_voice, voice_v, voice_speed, wikidata_qid, celeb_tier, view_count, youtube_videos')
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
    factionTagsResult,
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
      .select('tag_id, spotlight_image_url, sort_order, short_desc, short_desc_en, long_desc, long_desc_en, tag:celeb_tags(id, name, name_en, slug, color, description, description_en, youtube_videos, theme_music)')
      .eq('celeb_id', userId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('celeb_relations')
      .select('rel_type, rel_group, note, note_en, target:profiles!celeb_relations_to_id_fkey(id, slug, nickname, nickname_en, avatar_url, profession, nationality, birth_date, death_date, status, wikidata_qid)')
      .eq('from_id', userId),
    supabase
      .from('celeb_relations_external')
      .select('rel_type, rel_group, qid, name_ko, name_en, image_url, note, note_en')
      .eq('from_id', userId),
  ])

  const contentTypeCounts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
  for (const row of typeCountsResult.data ?? []) {
    const type = row.content_type as keyof ContentTypeCounts
    if (CONTENT_TYPES.includes(type)) contentTypeCounts[type] = Number(row.total)
  }

  // 슬러그 없는 태그는 세력도감 딥링크로 이동할 수 없어 제외한다
  const factionTags: FactionTagItem[] = ((factionTagsResult.data ?? []) as unknown as FactionTagAssignmentRow[])
    .filter((a): a is FactionTagAssignmentRow & { tag: NonNullable<FactionTagAssignmentRow['tag']> } => !!a.tag?.slug)
    .map((a) => ({
      id: a.tag.id,
      name: a.tag.name,
      name_en: a.tag.name_en,
      slug: a.tag.slug as string,
      color: a.tag.color ?? '#b4965a',
      factionImageUrl: a.spotlight_image_url ?? null,
      description: a.tag.description ?? null,
      description_en: a.tag.description_en ?? null,
      roleShort: a.short_desc ?? null,
      roleShortEn: a.short_desc_en ?? null,
      roleLong: a.long_desc ?? null,
      roleLongEn: a.long_desc_en ?? null,
      videos: toFactionVideos(a.tag.youtube_videos),
      music: toFactionMusic(a.tag.theme_music),
    }))

  // 비활성·슬러그 없는 상대는 페이지가 없어 이동만 막고, 사람 자체는 이름 노드로 남긴다.
  // (킴벌 머스크처럼 명단에 있으나 비공개인 형제가 통째로 사라지던 문제)
  const internalRelations: CelebRelationItem[] = ((relationsResult.data ?? []) as unknown as CelebRelationRow[])
    .filter((r): r is CelebRelationRow & { target: NonNullable<CelebRelationRow['target']> } => !!r.target)
    .map((r) => ({
      relType: r.rel_type,
      relGroup: r.rel_group,
      id: r.target.id,
      slug: r.target.slug && r.target.status === 'active' ? r.target.slug : null,
      nickname: r.target.nickname || 'Unknown',
      nickname_en: r.target.nickname_en,
      avatar_url: r.target.avatar_url,
      profession: r.target.profession,
      nationality: r.target.nationality,
      birth_date: r.target.birth_date,
      death_date: r.target.death_date,
      // 페이지가 없는 상대는 위키데이터 원본으로라도 연결한다
      qid: r.target.slug && r.target.status === 'active' ? null : r.target.wikidata_qid,
      note: r.note,
      note_en: r.note_en,
    }))

  // 명단 밖 인물(위키데이터 등재) — 이름 노드. 셀럽이 자리를 먼저 차지하도록 뒤에 붙인다
  const externalRelations: CelebRelationItem[] = ((externalRelationsResult.data ?? []) as unknown as
    { rel_type: string; rel_group: CelebRelationItem['relGroup']; qid: string; name_ko: string | null; name_en: string | null; image_url: string | null; note: string | null; note_en: string | null }[])
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
      nationality: null,
      birth_date: null,
      death_date: null,
      qid: r.qid,
      note: r.note,
      note_en: r.note_en,
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
    factionTags,
    relations,
  }
}

const getCelebBySlugCached = unstable_cache(
  fetchCelebBySlugPublic,
  ['celeb-by-slug'],
  // profiles(셀럽 본체) + user_contents(서고 수) + celeb_dialogues + celeb_tag_assignments(소속 세력도감)
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS] }
)

// React.cache로 같은 RSC 요청(generateMetadata + default export 등) 안의 중복 호출 dedup
export const getCelebBySlug = cache(getCelebBySlugInner);

export type CelebBySlugProfile = PublicUserProfile & {
  contentTypeCounts: ContentTypeCounts
  factionTags: FactionTagItem[]
  relations: CelebRelationItem[]
}

async function getCelebBySlugInner(
  slug: string,
  locale: string = 'ko'
): Promise<ActionResult<CelebBySlugProfile>> {
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
      view_count: profile.view_count ?? 0,
      youtube_videos: profile.youtube_videos ?? null,
      contentTypeCounts: pub.contentTypeCounts,
      // 배포 전에 만들어진 캐시 항목에는 이 필드가 없다 — 빈 배열로 대체해 화면 오류를 막는다
      factionTags: pub.factionTags ?? [],
      relations: pub.relations ?? [],
    },
  }
}
