'use server'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { type ActionResult, failure } from '@/lib/errors'
import { type PublicUserProfile, type CelebTier } from './getUserProfile'
import { getTitleInfo } from '@/constants/titles'
import {
  DIALOGUE_PROFILE_SELECT,
  getDisplayDialogueQuote,
  type DialogueProfile,
} from '@/lib/utils/celeb-dialogues'
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
  /** 이 테마를 다룬 세력도감 영상(긴 영상·짧은 영상). 둘 다 없으면 null */
  videos: FactionVideos | null
  /** 이 테마 구간에 흐르는 배경음악. 없으면 null */
  music: FactionMusic | null
}

interface FactionTagAssignmentRow {
  tag_id: string
  faction_image_url: string | null
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
    content_research_status: string | null
    view_count: number | null
    youtube_videos: Record<string, { videoId: string; uploadedAt: string }> | null
    portrait_url: string | null
    portrait_caption: string | null
    portrait_caption_en: string | null
  }
  contentCount: number
  followerCount: number
  guestbookCount: number
  contentTypeCounts: ContentTypeCounts
  dialogue: DialogueProfile | null
  explanation: {
    plain_text: string
    plain_text_en: string | null
    interpretive_title: string
    interpretive_title_en: string | null
    interpretive_text: string
    interpretive_text_en: string | null
  } | null
  factionTags: FactionTagItem[]
  relations: CelebRelationItem[]
  /** 상단 대표 화보(1:1). 전용 화보가 없으면 세력도감 화보를 끌어다 쓴다 */
  photoUrl: string | null
  /** 그 화보가 그린 순간을 적은 한 줄. 비어 있으면 화면에 아무것도 뜨지 않는다 */
  photoCaption: string | null
  photoCaptionEn: string | null
}

async function fetchCelebBySlugPublic(slug: string): Promise<PublicCelebBySlugData | null> {
  const supabase = createStaticClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, bio, bio_en, profession, title, title_en, nationality, birth_date, death_date, is_verified, created_at, selected_title, has_voice, voice_v, voice_speed, wikidata_qid, celeb_tier, content_research_status, view_count, youtube_videos, portrait_url, portrait_caption, portrait_caption_en')
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
    factionTagRows,
    relationsResult,
    externalRelationsResult,
    explanationResult,
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
    // 세력도감 소속 — 단일 원천은 제작 테이블(faction_people)이고 DB 뷰 faction_atlas_members가
    // 웹 전용 배정과 합쳐 준다. UNION 뷰는 태그 embed가 안 되므로 뷰 → celeb_tags 두 단계로 읽는다.
    (async (): Promise<FactionTagAssignmentRow[]> => {
      const { data: memberRows } = await supabase
        .from('faction_atlas_members')
        .select('tag_id, faction_image_url, sort_order, short_desc, short_desc_en, long_desc, long_desc_en')
        .eq('celeb_id', userId)
        .eq('hidden', false)
        .order('sort_order', { ascending: true })
        .overrideTypes<Omit<FactionTagAssignmentRow, 'tag'>[], { merge: false }>()
      if (!memberRows?.length) return []

      const tagIds = [...new Set(memberRows.map((r) => r.tag_id))]
      const { data: tagRows } = await supabase
        .from('celeb_tags')
        .select('id, name, name_en, slug, color, description, description_en, youtube_videos, theme_music')
        .in('id', tagIds)
        .overrideTypes<NonNullable<FactionTagAssignmentRow['tag']>[], { merge: false }>()
      const tagById = new Map((tagRows ?? []).map((t) => [t.id, t]))

      return memberRows.map((r) => ({ ...r, tag: tagById.get(r.tag_id) ?? null }))
    })(),
    supabase
      .from('celeb_relations')
      .select('rel_type, rel_group, note, note_en, target:profiles!celeb_relations_to_id_fkey(id, slug, nickname, nickname_en, avatar_url, profession, nationality, birth_date, death_date, status, wikidata_qid)')
      .eq('from_id', userId),
    supabase
      .from('celeb_relations_external')
      .select('rel_type, rel_group, qid, name_ko, name_en, image_url, note, note_en')
      .eq('from_id', userId),
    supabase
      .from('celeb_explanations')
      .select('plain_text, plain_text_en, interpretive_title, interpretive_title_en, interpretive_text, interpretive_text_en')
      .eq('profile_id', userId)
      .maybeSingle(),
  ])

  if (explanationResult.error) {
    console.error('공개 인물 읽어보기 조회 실패:', explanationResult.error)
  }

  const contentTypeCounts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
  for (const row of typeCountsResult.data ?? []) {
    const type = row.content_type as keyof ContentTypeCounts
    if (CONTENT_TYPES.includes(type)) contentTypeCounts[type] = Number(row.total)
  }

  // 슬러그 없는 태그는 세력도감 딥링크로 이동할 수 없어 제외한다
  const factionTags: FactionTagItem[] = factionTagRows
    .filter((a): a is FactionTagAssignmentRow & { tag: NonNullable<FactionTagAssignmentRow['tag']> } => !!a.tag?.slug)
    .map((a) => ({
      id: a.tag.id,
      name: a.tag.name,
      name_en: a.tag.name_en,
      slug: a.tag.slug as string,
      color: a.tag.color ?? '#b4965a',
      factionImageUrl: a.faction_image_url ?? null,
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
      // 등록 인물도 관계 카드에서 본 카드와 위키데이터 원본을 함께 제공한다.
      qid: r.target.wikidata_qid,
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
    contentCount: resolveCelebContentCount(
      contentCountResult.count,
      profile.content_research_status,
      true
    ),
    followerCount: followerResult.count || 0,
    guestbookCount: guestbookResult.count || 0,
    contentTypeCounts,
    dialogue: (dialogueResult.data as unknown as DialogueProfile | null) ?? null,
    explanation: explanationResult.data ?? null,
    factionTags,
    relations,
    // 전용 화보 → 세력도감 화보(정렬 첫 장) 순. 둘 다 없으면 화면이 얼굴 사진으로 돌아간다
    photoUrl: profile.portrait_url ?? factionTags.find((t) => t.factionImageUrl)?.factionImageUrl ?? null,
    // 설명은 전용 화보에만 붙는다. 세력도감 화보를 끌어다 쓴 경우에는 그 그림의 설명이 아니므로 비운다
    photoCaption: profile.portrait_url ? profile.portrait_caption ?? null : null,
    photoCaptionEn: profile.portrait_url ? profile.portrait_caption_en ?? null : null,
  }
}

const getCelebBySlugCached = unstable_cache(
  fetchCelebBySlugPublic,
  // v4: 공개된 인물 안내·인물 탐구를 읽어보기 구획에 추가한다.
  ['celeb-by-slug-v4'],
  // profiles(셀럽 본체) + user_contents(서고 수) + celeb_dialogues + faction_atlas_members(소속 세력도감)
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS] }
)

// React.cache로 같은 RSC 요청(generateMetadata + default export 등) 안의 중복 호출 dedup
export const getCelebBySlug = cache(getCelebBySlugInner);

export type CelebBySlugProfile = PublicUserProfile & {
  contentTypeCounts: ContentTypeCounts
  factionTags: FactionTagItem[]
  relations: CelebRelationItem[]
  /** 상단 대표 화보(1:1). 없으면 null이라 화면이 얼굴 사진으로 돌아간다 */
  photo_url: string | null
  /** 그 화보가 그린 순간 한 줄. 비면 크게 보기에 아무것도 뜨지 않는다. 캐시가 언어를 안 타므로 둘 다 내리고 화면에서 고른다 */
  photo_caption: string | null
  photo_caption_en: string | null
  reading: {
    guide: string
    explorationTitle: string
    explorationText: string
  } | null
  /** 영문 화면에서 영문본이 없어 한국어 원문을 대신 보여주는 필드 */
  translationFallbacks: string[]
}

async function getCelebBySlugInner(
  slug: string,
  locale: string = 'ko'
): Promise<ActionResult<CelebBySlugProfile>> {
  const pub = await getCelebBySlugCached(slug)

  if (!pub) {
    return failure('NOT_FOUND', '셀럽을 찾을 수 없다.')
  }

  const profile = pub.profile
  const selectedTitle = getTitleInfo(profile.selected_title)

  const isEn = locale === 'en'
  const translationFallbacks: string[] = []
  const resolve = <T,>(
    field: string,
    en: T | null | undefined,
    ko: T,
  ): T => {
    if (!isEn) return ko
    if (en) return en
    if (ko) translationFallbacks.push(field)
    return ko
  }

  const d = pub.dialogue
  const quoteKo = getDisplayDialogueQuote(d?.quote)
  const quoteEn = getDisplayDialogueQuote(d?.quote_en)

  return {
    success: true,
    data: {
      id: profile.id,
      slug: profile.slug ?? null,
      nickname: resolve('nickname', profile.nickname_en, profile.nickname || 'Unknown'),
      nickname_en: profile.nickname_en,
      nickname_ko: profile.nickname || 'Unknown',
      avatar_url: profile.avatar_url,
      bio: resolve('bio', profile.bio_en, profile.bio),
      quotes: resolve('quotes', quoteEn, quoteKo),
      monologue: resolve('monologue', d?.monologue_en ?? null, d?.monologue ?? null),
      profession: profile.profession,
      title: resolve('title', profile.title_en, profile.title),
      title_en: profile.title_en,
      title_ko: profile.title,
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
      // 이 공개 프로필 조회는 정적/ISR 렌더에서도 쓴다. viewer 관계는 모달·팔로우
      // 전용 액션이 클라이언트에서 조회하며, 공개 문서에는 섞지 않는다.
      is_following: false,
      is_follower: false,
      is_blocked: false,
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
      photo_url: pub.photoUrl ?? null,
      photo_caption: pub.photoCaption ?? null,
      photo_caption_en: pub.photoCaptionEn ?? null,
      reading: pub.explanation
        ? {
            guide: resolve('personGuide', pub.explanation.plain_text_en, pub.explanation.plain_text),
            explorationTitle: resolve(
              'personExploreTitle',
              pub.explanation.interpretive_title_en,
              pub.explanation.interpretive_title,
            ),
            explorationText: resolve(
              'personExplore',
              pub.explanation.interpretive_text_en,
              pub.explanation.interpretive_text,
            ),
          }
        : null,
      translationFallbacks,
    },
  }
}
