'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { toTeamImages } from '@feelandnote/shared/lib/faction-team-image'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'

const HUB_TAG_LIMIT = 4
const HUB_MEMBER_LIMIT = 4

interface HubTagRow {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  parent_id: string | null
  team_images: unknown
}

interface HubAssignmentRow {
  tag_id: string
  celeb_id: string
}

interface HubProfileRow {
  id: string
  avatar_url: string | null
  nickname: string
  nickname_en: string | null
}

export interface FactionHubPreview {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  /** 단체샷 표지 — 없으면 색 카드로 폴백 */
  cover: string | null
  celebs: HubProfileRow[]
}

async function fetchFactionHubPreviews(): Promise<FactionHubPreview[]> {
  const supabase = createStaticClient()
  const { data: tags, error: tagsError } = await supabase
    .from('celeb_tags')
    .select('id, name, name_en, description, description_en, color, parent_id, team_images')
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })

  if (tagsError) {
    throw new Error(`Failed to load faction hub tags: ${tagsError.message}`)
  }
  if (!tags?.length) return []

  const tagRows = tags as HubTagRow[]
  const tagIds = tagRows.map((tag) => tag.id)
  const assignments = await selectInChunks<HubAssignmentRow>(
    tagIds,
    (chunk) =>
      supabase
        // 단일 원천은 제작 테이블(faction_people) — 뷰가 웹 전용 배정과 합쳐 준다
        .from('faction_atlas_members')
        .select('tag_id, celeb_id')
        .in('tag_id', chunk)
        .eq('hidden', false)
        .order('sort_order', { ascending: true })
        .order('celeb_id', { ascending: true })
        .overrideTypes<HubAssignmentRow[], { merge: false }>(),
  )

  const assignmentsByTag = new Map<string, HubAssignmentRow[]>()
  for (const assignment of assignments) {
    const current = assignmentsByTag.get(assignment.tag_id) ?? []
    current.push(assignment)
    assignmentsByTag.set(assignment.tag_id, current)
  }

  /*
    허브 4장은 종류를 섞는다 — 앞 순번만 뽑으면 인공지능 테마만 나온다.
    규칙: 대분류(상위 묶음)가 겹치지 않게 하나씩, 단체샷 있는 테마 우선.
    (예: AI 선구자들 · 페이팔 마피아 · 디지털 레지스탕스 · 그리스 로마 신화)
  */
  const hasPeople = (tag: HubTagRow) => (assignmentsByTag.get(tag.id)?.length ?? 0) > 0
  const coverOf = (tag: HubTagRow) => toTeamImages(tag.team_images)[0]?.url ?? null

  const selectedTags: HubTagRow[] = []
  const usedParents = new Set<string>()
  for (const requireCover of [true, false]) {
    for (const tag of tagRows) {
      if (selectedTags.length >= HUB_TAG_LIMIT) break
      if (selectedTags.includes(tag) || !hasPeople(tag)) continue
      if (requireCover && !coverOf(tag)) continue
      const parentKey = tag.parent_id ?? tag.id
      if (usedParents.has(parentKey)) continue
      usedParents.add(parentKey)
      selectedTags.push(tag)
    }
  }
  // 그래도 모자라면 대분류 중복을 허용해 채운다
  for (const tag of tagRows) {
    if (selectedTags.length >= HUB_TAG_LIMIT) break
    if (!selectedTags.includes(tag) && hasPeople(tag)) selectedTags.push(tag)
  }

  const selectedCelebIds = [...new Set(
    selectedTags.flatMap((tag) =>
      (assignmentsByTag.get(tag.id) ?? [])
        .slice(0, HUB_MEMBER_LIMIT)
        .map((assignment) => assignment.celeb_id),
    ),
  )]

  const profiles = await selectInChunks<HubProfileRow>(
    selectedCelebIds,
    (chunk) =>
      supabase
        .from('profiles')
        .select('id, avatar_url, nickname, nickname_en')
        .in('id', chunk)
        .overrideTypes<HubProfileRow[], { merge: false }>(),
  )
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

  return selectedTags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    name_en: tag.name_en,
    description: tag.description,
    description_en: tag.description_en,
    color: tag.color,
    cover: coverOf(tag),
    celebs: (assignmentsByTag.get(tag.id) ?? [])
      .slice(0, HUB_MEMBER_LIMIT)
      .flatMap((assignment) => {
        const profile = profileById.get(assignment.celeb_id)
        return profile ? [profile] : []
      }),
  }))
}

const getCachedFactionHubPreviews = unstable_cache(
  fetchFactionHubPreviews,
  ['faction-hub-previews'],
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS],
  },
)

export async function getFactionHubPreviews(): Promise<FactionHubPreview[]> {
  return getCachedFactionHubPreviews()
}
