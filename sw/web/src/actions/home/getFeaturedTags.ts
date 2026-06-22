'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { CelebProfile, CelebTagInfo } from '@/types/home'
import type { Database, Tables } from '@/types/supabase'
import { getCelebLevelByRanking } from '@/constants/materials'
import { DIALOGUE_BRIEF_SELECT_WITH_ID, type DialogueBriefWithId } from '@/lib/utils/celeb-dialogues'

export type FeaturedCeleb = CelebProfile & {
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  spotlight_image_url: string | null
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
  celebs: FeaturedCeleb[]
  is_featured: boolean
}

// --- 조회 행 타입 (select 문자열과 1:1 대응) ---

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
  is_featured: boolean | null
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
  cultural_journey: string | null
  cultural_journey_en: string | null
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
    .select('id, name, name_en, description, description_en, color, slug, team_images, is_featured')
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })

  if (!allTags?.length) return []

  const tagRows = allTags as FeaturedTagRow[]
  const activeTags = tagRows.filter(t => t.is_featured)
  const upcomingTags = tagRows.filter(t => !t.is_featured)

  if (!activeTags.length) return []

  const tagIds = activeTags.map(t => t.id)

  // 2. 모든 태그의 assignments 한 번에 조회
  const { data: allAssignments } = await supabase
    .from('celeb_tag_assignments')
    .select('celeb_id, tag_id, short_desc, short_desc_en, long_desc, long_desc_en, spotlight_image_url, sort_order')
    .in('tag_id', tagIds)
    .order('sort_order', { ascending: true })

  const assignmentsByTag: Record<string, TagAssignmentRow[]> = {}
  const allCelebIds = new Set<string>()

  activeTags.forEach(tag => {
    const tagAssignments = ((allAssignments ?? []) as TagAssignmentRow[])
      .filter(a => a.tag_id === tag.id)
      .slice(0, 12)
    assignmentsByTag[tag.id] = tagAssignments
    tagAssignments.forEach(a => allCelebIds.add(a.celeb_id))
  })

  const celebIdArray = Array.from(allCelebIds)
  if (celebIdArray.length === 0) {
    return activeTags.map(tag => ({ ...tag, name_en: tag.name_en ?? null, description: tag.description ?? null, description_en: tag.description_en ?? null, slug: tag.slug ?? null, team_images: toImageArray(tag.team_images), celebs: [], is_featured: true }))
  }

  // 3. 모든 셀럽 데이터 병렬 조회
  const [profilesResult, followsResult, influencesResult, tagDataResult, contentCountsResult, dialoguesResult] = await Promise.all([
    supabase.from('profiles').select(`
      id, slug, nickname, nickname_en, avatar_url, title, title_en, profession,
      cultural_journey, cultural_journey_en, nationality, birth_date, death_date,
      bio, bio_en, is_verified, claimed_by, speech_tone, has_voice, voice_v, voice_speed
    `).in('id', celebIdArray),
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
    const assignments = assignmentsByTag[tag.id] ?? []
    if (!assignments.length) continue

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
          cultural_journey: c.cultural_journey,
          cultural_journey_en: c.cultural_journey_en ?? null,
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
          spotlight_image_url: a.spotlight_image_url ?? null,
        }
      })
      .filter((c): c is FeaturedCeleb => c !== null)

    if (celebs.length > 0) {
      result.push({
        id: tag.id, name: tag.name, name_en: tag.name_en ?? null,
        description: tag.description, description_en: tag.description_en ?? null,
        color: tag.color, slug: tag.slug ?? null, team_images: toImageArray(tag.team_images),
        celebs, is_featured: true,
      })
    }
  }

  // 비활성 태그 추가
  for (const tag of upcomingTags) {
    result.push({
      id: tag.id, name: tag.name, name_en: tag.name_en ?? null,
      description: tag.description, description_en: tag.description_en ?? null,
      color: tag.color, slug: tag.slug ?? null, team_images: toImageArray(tag.team_images),
      celebs: [], is_featured: false,
    })
  }

  return result
}

const getCachedFeaturedTags = unstable_cache(
  fetchFeaturedTagsPublic,
  ['featured-tags'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)

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
