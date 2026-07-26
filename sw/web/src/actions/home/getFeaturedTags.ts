'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { CelebProfile, CelebTagInfo } from '@/types/home'
import type { Database, Tables } from '@/types/supabase'
import { getCelebLevelByRanking } from '@/constants/materials'
import { DIALOGUE_BRIEF_SELECT_WITH_ID, type DialogueBriefWithId } from '@/lib/utils/celeb-dialogues'
import { toFactionMusic, toFactionVideos, type FactionMusic, type FactionVideos } from '@/lib/faction-videos'

export type FeaturedCeleb = CelebProfile & {
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  spotlight_image_url: string | null
  /**
   * 세력도 영상에서 이 인물이 하는 말 — 개인 화보에서 말풍선으로 띄운다.
   * `CelebProfile.quotes`(셀럽 명언)와 다른 값이다. 원천은 제작 데이터이고 출간이 실어 나른다.
   */
  faction_quote: string | null
  faction_quote_en: string | null
}

export interface FeaturedTag {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  team_images: string[]
  /** 이 테마를 다룬 유튜브 영상(긴 영상·짧은 영상). 둘 다 없으면 null */
  videos: FactionVideos | null
  /** 이 테마 구간에 흐르는 배경음악. 없으면 null */
  music: FactionMusic | null
  celebs: FeaturedCeleb[]
  is_featured: boolean
  /** 이 태그가 속한 상위 그룹 slug (자식이면 'ai', 최상위면 null) */
  parentSlug?: string | null
  /** 이 태그가 그룹 헤더인지 (자식을 접었다 펴는 상위 카드) */
  isGroup?: boolean
}

export interface FactionPreviewMember {
  id: string
  slug: string | null
  nickname: string
  nicknameEn: string | null
  avatarUrl: string | null
  roleShort: string | null
  roleShortEn: string | null
}

export interface FactionTagPreview {
  tagId: string
  teamImages: string[]
  members: FactionPreviewMember[]
}

// --- 조회 행 타입 (select 문자열과 1:1 대응) ---

interface FactionPreviewAssignmentRow {
  tag_id: string
  celeb_id: string
  short_desc: string | null
  short_desc_en: string | null
}

interface FactionPreviewProfileRow {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
}

type TagAssignmentRow = Tables<'celeb_tag_assignments'>
type ContentCountRow = Database['public']['Functions']['count_contents_by_users']['Returns'][number]

interface FeaturedTagRow {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  team_images: unknown
  youtube_videos: unknown
  theme_music: unknown
  is_featured: boolean | null
  parent_id: string | null
}

// team_images Json → string[]
function toImageArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter((x): x is string => typeof x === 'string')) : []
}


interface FeaturedProfileRow {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  title: string | null
  title_en: string | null
  profession: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  bio_en: string | null
  is_verified: boolean | null
  claimed_by: string | null
  speech_tone: string | null
  has_voice: boolean
  voice_v: number
  voice_speed: number
}

interface TagJoinRow {
  celeb_id: string
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  tag: { id: string; name: string; name_en: string | null; color: string } | null
}

// --- 공개 데이터 캐싱 (1시간) ---

async function fetchFeaturedTagsPublic(): Promise<FeaturedTag[]> {
  const supabase = createStaticClient()

  // 1. 모든 태그 조회
  const { data: allTags } = await supabase
    .from('celeb_tags')
    .select('id, name, name_en, description, description_en, color, slug, team_images, youtube_videos, theme_music, is_featured, parent_id')
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })

  if (!allTags?.length) return []

  const tagRows = allTags as FeaturedTagRow[]
  const activeTags = tagRows.filter(t => t.is_featured)
  const upcomingTags = tagRows.filter(t => !t.is_featured)

  // 상위 그룹 위계 — celeb_tags.parent_id 가 정본이다(26.07.26 코드 상수에서 승격).
  // 그룹 헤더는 따로 표시하는 값이 아니라 "자식을 하나라도 가진 태그"로 판정한다.
  // 노출 여부와 무관하게 전체 행으로 계산해야 숨긴 자식·숨긴 부모가 섞여도 위계가 유지된다.
  const slugById = new Map<string, string>()
  const childCountByParent = new Map<string, number>()
  for (const t of tagRows) {
    if (t.slug) slugById.set(t.id, t.slug)
    if (t.parent_id) childCountByParent.set(t.parent_id, (childCountByParent.get(t.parent_id) ?? 0) + 1)
  }
  const isGroupTag = (t: FeaturedTagRow) => (childCountByParent.get(t.id) ?? 0) > 0
  const parentSlugOf = (t: FeaturedTagRow) => (t.parent_id ? slugById.get(t.parent_id) ?? null : null)

  if (!activeTags.length) return []

  const tagIds = activeTags.map(t => t.id)

  // 2. 모든 태그의 assignments 한 번에 조회
  const { data: allAssignments } = await supabase
    .from('celeb_tag_assignments')
    .select('celeb_id, tag_id, short_desc, short_desc_en, long_desc, long_desc_en, quote, quote_en, spotlight_image_url, sort_order')
    .in('tag_id', tagIds)
    .order('sort_order', { ascending: true })

  const assignmentsByTag: Record<string, TagAssignmentRow[]> = {}
  const allCelebIds = new Set<string>()

  activeTags.forEach(tag => {
    const tagAssignments = ((allAssignments ?? []) as TagAssignmentRow[])
      .filter(a => a.tag_id === tag.id)
      .slice(0, 16)
    assignmentsByTag[tag.id] = tagAssignments
    tagAssignments.forEach(a => allCelebIds.add(a.celeb_id))
  })

  const celebIdArray = Array.from(allCelebIds)
  if (celebIdArray.length === 0) {
    return activeTags.map(tag => ({ ...tag, name_en: tag.name_en ?? null, description: tag.description ?? null, description_en: tag.description_en ?? null, slug: tag.slug ?? null, team_images: toImageArray(tag.team_images), videos: toFactionVideos(tag.youtube_videos), music: toFactionMusic(tag.theme_music), celebs: [], is_featured: true }))
  }

  // 3. 모든 셀럽 데이터 병렬 조회
  const [profilesResult, followsResult, influencesResult, tagDataResult, contentCountsResult, dialoguesResult] = await Promise.all([
    // 편성에 배정됐어도 비활성이거나 목록 노출 등급이 아니면 제외한다
    // (여기서 빠진 셀럽은 profileMap에 없어 아래 조합 단계에서 자연히 걸러진다)
    supabase.from('profiles').select(`
      id, slug, nickname, nickname_en, avatar_url, title, title_en, profession,
      nationality, birth_date, death_date,
      bio, bio_en, is_verified, claimed_by, speech_tone, has_voice, voice_v, voice_speed
    `).in('id', celebIdArray)
      .eq('status', 'active')
      .in('celeb_tier', [...LISTING_DEFAULT_TIERS]),
    supabase.from('follows').select('following_id').in('following_id', celebIdArray),
    supabase.from('celeb_influence').select('celeb_id, total_score').in('celeb_id', celebIdArray),
    supabase.from('celeb_tag_assignments')
      .select('celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, tag:celeb_tags(id, name, name_en, color)')
      .in('celeb_id', celebIdArray),
    supabase.rpc('count_contents_by_users', { user_ids: celebIdArray }),
    supabase.from('celeb_dialogues').select(DIALOGUE_BRIEF_SELECT_WITH_ID).in('celeb_id', celebIdArray),
  ])

  // 맵 구성
  const profileMap = new Map<string, FeaturedProfileRow>()
  ;((profilesResult.data ?? []) as FeaturedProfileRow[]).forEach(p => profileMap.set(p.id, p))

  const followerCountMap = new Map<string, number>()
  ;((followsResult.data ?? []) as Pick<Tables<'follows'>, 'following_id'>[]).forEach(f => {
    followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) ?? 0) + 1)
  })

  const influenceMap = new Map<string, number>()
  ;((influencesResult.data ?? []) as Pick<Tables<'celeb_influence'>, 'celeb_id' | 'total_score'>[]).forEach(inf => {
    influenceMap.set(inf.celeb_id, inf.total_score ?? 0)
  })

  const tagsMap = new Map<string, CelebTagInfo[]>()
  // 다대일 조인(tag)을 supabase가 배열로 잘못 추론하므로 unknown 경유 캐스트
  ;((tagDataResult.data ?? []) as unknown as TagJoinRow[]).forEach(item => {
    if (!item.tag) return
    const list = tagsMap.get(item.celeb_id) ?? []
    list.push({ ...item.tag, short_desc: item.short_desc, short_desc_en: item.short_desc_en, long_desc: item.long_desc, long_desc_en: item.long_desc_en })
    tagsMap.set(item.celeb_id, list)
  })

  const contentCountMap = new Map<string, number>()
  if (contentCountsResult.data) {
    (contentCountsResult.data as ContentCountRow[]).forEach(c => contentCountMap.set(c.user_id, c.count))
  }

  const dialogueMap = new Map<string, { greeting?: string[] | null; greeting_en?: string[] | null; quote?: string | null; quote_en?: string | null }>()
  ;((dialoguesResult.data ?? []) as unknown as DialogueBriefWithId[]).forEach(d => {
    dialogueMap.set(d.celeb_id, {
      greeting: d.greeting ?? null,
      greeting_en: d.greeting_en ?? null,
      quote: d.quote ?? null,
      quote_en: d.quote_en ?? null,
    })
  })

  // 결과 조합
  const result: FeaturedTag[] = []

  for (const tag of activeTags) {
    const isGroup = isGroupTag(tag)
    const parentSlug = parentSlugOf(tag)
    const assignments = assignmentsByTag[tag.id] ?? []
    if (!assignments.length && !isGroup) continue // 그룹 헤더는 배정이 없어도 목록에 포함한다

    const celebs: FeaturedCeleb[] = assignments
      .map((a): FeaturedCeleb | null => {
        const c = profileMap.get(a.celeb_id)
        if (!c) return null

        const score = influenceMap.get(c.id) ?? 0

        return {
          id: c.id,
          slug: c.slug ?? null,
          nickname: c.nickname,
          nickname_en: c.nickname_en ?? null,
          avatar_url: c.avatar_url,
          title: c.title,
          title_en: c.title_en ?? null,
          profession: c.profession,
          nationality: c.nationality,
          birth_date: c.birth_date,
          death_date: c.death_date,
          bio: c.bio,
          bio_en: c.bio_en ?? null,
          quotes: dialogueMap.get(c.id)?.quote ?? null,
          quotes_en: dialogueMap.get(c.id)?.quote_en ?? null,
          is_verified: c.is_verified ?? false,
          is_platform_managed: c.claimed_by === null,
          follower_count: followerCountMap.get(c.id) ?? 0,
          content_count: contentCountMap.get(c.id) ?? 0,
          is_following: false, // 캐싱 데이터 — 유저별 상태 제외
          is_follower: false,
          influence: score > 0 ? {
            total_score: score,
            level: getCelebLevelByRanking(1, 1),
            ranking: undefined,
            percentile: undefined
          } : null,
          tags: tagsMap.get(c.id) ?? [],
          speech_tone: c.speech_tone ?? null,
          greeting: dialogueMap.get(c.id)?.greeting ?? null,
          greeting_en: dialogueMap.get(c.id)?.greeting_en ?? null,
          has_voice: c.has_voice ?? false,
          voice_v: c.voice_v ?? 0,
          voice_speed: c.voice_speed ?? 1.0,
          short_desc: a.short_desc,
          short_desc_en: a.short_desc_en,
          long_desc: a.long_desc,
          long_desc_en: a.long_desc_en,
          faction_quote: a.quote ?? null,
          faction_quote_en: a.quote_en ?? null,
          spotlight_image_url: a.spotlight_image_url ?? null,
        }
      })
      .filter((c): c is FeaturedCeleb => c !== null)

    if (celebs.length > 0 || isGroup) {
      result.push({
        id: tag.id, name: tag.name, name_en: tag.name_en ?? null,
        description: tag.description, description_en: tag.description_en ?? null,
        color: tag.color, slug: tag.slug ?? null, team_images: toImageArray(tag.team_images),
        videos: toFactionVideos(tag.youtube_videos),
        music: toFactionMusic(tag.theme_music),
        celebs, is_featured: true, parentSlug, isGroup,
      })
    }
  }

  // 비활성 태그 추가
  for (const tag of upcomingTags) {
    result.push({
      id: tag.id, name: tag.name, name_en: tag.name_en ?? null,
      description: tag.description, description_en: tag.description_en ?? null,
      color: tag.color, slug: tag.slug ?? null, team_images: toImageArray(tag.team_images),
      videos: toFactionVideos(tag.youtube_videos),
      music: toFactionMusic(tag.theme_music),
      celebs: [], is_featured: false,
      parentSlug: parentSlugOf(tag),
      isGroup: isGroupTag(tag),
    })
  }

  return result
}

const getCachedFeaturedTags = unstable_cache(
  fetchFeaturedTagsPublic,
  ['featured-tags'],
  // celeb_tags·celeb_tag_assignments(편성) + profiles·celeb_influence + celeb_dialogues +
  // 콘텐츠 수 집계(user_contents)를 함께 읽는다
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES],
  }
)

async function fetchFactionTagPreviews(tagIds: string[]): Promise<FactionTagPreview[]> {
  const supabase = createStaticClient()
  const [tagsResult, assignmentsResult] = await Promise.all([
    supabase
      .from('celeb_tags')
      .select('id, team_images')
      .in('id', tagIds),
    supabase
      .from('celeb_tag_assignments')
      .select('tag_id, celeb_id, short_desc, short_desc_en')
      .in('tag_id', tagIds)
      .order('sort_order', { ascending: true })
      .order('celeb_id', { ascending: true }),
  ])

  if (tagsResult.error) {
    throw new Error(`Failed to load faction tags: ${tagsResult.error.message}`)
  }
  if (assignmentsResult.error) {
    throw new Error(`Failed to load faction assignments: ${assignmentsResult.error.message}`)
  }

  const assignments = (assignmentsResult.data ?? []) as FactionPreviewAssignmentRow[]
  const celebIds = [...new Set(assignments.map((assignment) => assignment.celeb_id))]
  let profiles: FactionPreviewProfileRow[] = []

  if (celebIds.length > 0) {
    const profilesResult = await supabase
      .from('profiles')
      .select('id, slug, nickname, nickname_en, avatar_url')
      .in('id', celebIds)
      .eq('status', 'active')

    if (profilesResult.error) {
      throw new Error(`Failed to load faction members: ${profilesResult.error.message}`)
    }
    profiles = (profilesResult.data ?? []) as FactionPreviewProfileRow[]
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const assignmentsByTag = new Map<string, FactionPreviewAssignmentRow[]>()

  for (const assignment of assignments) {
    const current = assignmentsByTag.get(assignment.tag_id) ?? []
    current.push(assignment)
    assignmentsByTag.set(assignment.tag_id, current)
  }

  const teamImagesByTag = new Map(
    (tagsResult.data ?? []).map((tag) => [tag.id, toImageArray(tag.team_images)]),
  )

  return tagIds.map((tagId) => ({
    tagId,
    teamImages: teamImagesByTag.get(tagId) ?? [],
    members: (assignmentsByTag.get(tagId) ?? []).flatMap((assignment) => {
      const profile = profileById.get(assignment.celeb_id)
      if (!profile) return []

      return [{
        id: profile.id,
        slug: profile.slug,
        nickname: profile.nickname,
        nicknameEn: profile.nickname_en,
        avatarUrl: profile.avatar_url,
        roleShort: assignment.short_desc,
        roleShortEn: assignment.short_desc_en,
      }]
    }),
  }))
}

const getCachedFactionTagPreviews = unstable_cache(
  fetchFactionTagPreviews,
  ['faction-tag-previews'],
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS],
  },
)

export async function getFactionTagPreviews(tagIds: string[]): Promise<FactionTagPreview[]> {
  if (tagIds.length === 0) return []
  return getCachedFactionTagPreviews([...new Set(tagIds)].sort())
}

export async function getFeaturedTags(): Promise<FeaturedTag[]> {
  const cachedTags = await getCachedFeaturedTags()

  // 유저별 팔로우 상태 추가
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return cachedTags

    const allCelebIds = cachedTags.flatMap(t => t.celebs.map(c => c.id))
    if (allCelebIds.length === 0) return cachedTags

    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', allCelebIds)

    if (!follows?.length) return cachedTags

    const myFollowings = new Set(follows.map(f => f.following_id))
    return cachedTags.map(tag => ({
      ...tag,
      celebs: tag.celebs.map(c => ({ ...c, is_following: myFollowings.has(c.id) })),
    }))
  } catch {
    return cachedTags
  }
}
