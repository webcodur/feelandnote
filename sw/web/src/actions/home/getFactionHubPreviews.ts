'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { mythBranchTagIds } from '@feelandnote/shared/lib/faction-atlas'
import { toTeamImages } from '@feelandnote/shared/lib/faction-team-image'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectVisibleAtlasMembers } from '@/lib/faction-atlas-members'

const HUB_TAG_LIMIT = 4

/**
 * 허브 4장 편성 — 사람이 고른 자리다(26.08.03).
 *
 * 자동 규칙(대분류 하나씩·단체샷 우선)에만 맡기면 앞 순번이 이겨서 인간형 로봇·마케도니아
 * 제국이 잡혔다. 여기 적은 순서대로 먼저 앉히고, 빠진 자리만 아래 자동 규칙이 채운다.
 * 이름이 바뀌거나 인물이 비면 그 자리는 조용히 자동 선정으로 넘어간다.
 * 신화는 세력도감에서 빼고 신화 화면이 따로 다뤄 그리스 신화 자리를 비웠다(26.09.14) — 빈자리는 자동 규칙이 채운다.
 */
const HUB_PINNED_SLUGS = ['ai-pioneers', 'paypal-mafia', 'digital-resistance']

interface HubTagRow {
  id: string
  slug: string | null
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  parent_id: string | null
  team_images: unknown
  is_featured: boolean | null
}

interface HubAssignmentRow {
  tag_id: string
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
}

async function fetchFactionHubPreviews(): Promise<FactionHubPreview[]> {
  const db = createStaticClient()
  const { data: tags, error: tagsError } = await db
    .from('celeb_tags')
    .select('id, slug, name, name_en, description, description_en, color, parent_id, team_images, is_featured')
    .order('sort_order', { ascending: true })

  if (tagsError) {
    throw new Error(`Failed to load faction hub tags: ${tagsError.message}`)
  }
  if (!tags?.length) return []

  /* 공개된 세력만 쓰되 신화 갈래는 뺀다 — 신화는 신화 화면이 따로 다룬다(26.09.14).
     신화 갈래는 공개 여부와 무관하게 전체 태그로 가려내야 부모가 닫혀 있어도 자손이 걸린다 */
  const mythTagIds = mythBranchTagIds(tags as HubTagRow[])
  const tagRows = (tags as HubTagRow[]).filter((tag) => tag.is_featured === true && !mythTagIds.has(tag.id))
  const tagIds = tagRows.map((tag) => tag.id)
  // 사람이 있는 테마만 가려낸다. 태그 묶음으로 읽던 때 한 묶음이 1,000행을 넘어 잘려, 잘린 테마가
  // 「사람 없음」으로 빠졌다(26.09.14). 공통 읽기로 끝까지 받는다
  const assignments = await selectVisibleAtlasMembers<HubAssignmentRow>(db, 'tag_id', tagIds)
  const tagIdsWithPeople = new Set(assignments.map((assignment) => assignment.tag_id))

  /*
    허브 4장은 종류를 섞는다 — 앞 순번만 뽑으면 인공지능 테마만 나온다.
    사람이 고른 편성(HUB_PINNED_SLUGS)이 먼저고, 남은 자리는 자동 규칙이 채운다.
    자동 규칙: 대분류가 겹치지 않게 하나씩, 단체샷 있는 테마 우선.
  */
  const hasPeople = (tag: HubTagRow) => tagIdsWithPeople.has(tag.id)
  const coverOf = (tag: HubTagRow) => toTeamImages(tag.team_images)[0]?.url ?? null

  const selectedTags: HubTagRow[] = []
  const usedParents = new Set<string>()

  const tagBySlug = new Map(tagRows.flatMap((tag) => (tag.slug ? [[tag.slug, tag] as const] : [])))
  for (const slug of HUB_PINNED_SLUGS) {
    if (selectedTags.length >= HUB_TAG_LIMIT) break
    const tag = tagBySlug.get(slug)
    if (!tag || selectedTags.includes(tag) || !hasPeople(tag)) continue
    usedParents.add(tag.parent_id ?? tag.id)
    selectedTags.push(tag)
  }

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

  return selectedTags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    name_en: tag.name_en,
    description: tag.description,
    description_en: tag.description_en,
    color: tag.color,
    cover: coverOf(tag),
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
