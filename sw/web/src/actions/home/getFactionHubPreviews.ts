'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { toTeamImages } from '@feelandnote/shared/lib/faction-team-image'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectVisibleFactionMembers } from '@/lib/faction-members'

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

interface HubFactionRow {
  id: string
  slug: string | null
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  lv1_id: string
  team_images: unknown
  is_featured: boolean | null
}

type LinkableHubFactionRow = HubFactionRow & { slug: string }

interface HubAssignmentRow {
  lv2_id: string
}

export interface FactionHubPreview {
  id: string
  slug: string
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
  /* 공개된 세력(lv2)만 쓰되 신화 가지는 뺀다 — 신화는 신화 화면이 따로 다룬다(26.09.14) */
  const { data: factions, error: tagsError } = await db
    .from('faction_lv2')
    .select('id, slug, name, name_en, description, description_en, color, lv1_id, team_images, is_featured')
    .eq('is_myth', false)
    .order('sort_order', { ascending: true })

  if (tagsError) {
    throw new Error(`Failed to load faction hub factions: ${tagsError.message}`)
  }
  if (!factions?.length) return []

  const factionRows = (factions as HubFactionRow[]).filter(
    (faction): faction is LinkableHubFactionRow => faction.is_featured === true && Boolean(faction.slug),
  )
  const factionIds = factionRows.map((faction) => faction.id)
  // 사람이 있는 세력만 가려낸다. 태그 묶음으로 읽던 때 한 묶음이 1,000행을 넘어 잘려, 잘린 세력이
  // 「사람 없음」으로 빠졌다(26.09.14). 공통 읽기로 끝까지 받는다
  const assignments = await selectVisibleFactionMembers<HubAssignmentRow>(db, 'lv2_id', factionIds)
  const factionIdsWithPeople = new Set(assignments.map((assignment) => assignment.lv2_id))

  /*
    허브 4장은 종류를 섞는다 — 앞 순번만 뽑으면 인공지능 테마만 나온다.
    사람이 고른 편성(HUB_PINNED_SLUGS)이 먼저고, 남은 자리는 자동 규칙이 채운다.
    자동 규칙: 대분류가 겹치지 않게 하나씩, 단체샷 있는 테마 우선.
  */
  const hasPeople = (faction: HubFactionRow) => factionIdsWithPeople.has(faction.id)
  const coverOf = (faction: HubFactionRow) => toTeamImages(faction.team_images)[0]?.url ?? null

  const selectedFactions: LinkableHubFactionRow[] = []
  const usedParents = new Set<string>()

  const factionBySlug = new Map(factionRows.flatMap((faction) => (faction.slug ? [[faction.slug, faction] as const] : [])))
  for (const slug of HUB_PINNED_SLUGS) {
    if (selectedFactions.length >= HUB_TAG_LIMIT) break
    const faction = factionBySlug.get(slug)
    if (!faction || selectedFactions.includes(faction) || !hasPeople(faction)) continue
    usedParents.add(faction.lv1_id)
    selectedFactions.push(faction)
  }

  for (const requireCover of [true, false]) {
    for (const faction of factionRows) {
      if (selectedFactions.length >= HUB_TAG_LIMIT) break
      if (selectedFactions.includes(faction) || !hasPeople(faction)) continue
      if (requireCover && !coverOf(faction)) continue
      if (usedParents.has(faction.lv1_id)) continue
      usedParents.add(faction.lv1_id)
      selectedFactions.push(faction)
    }
  }
  // 그래도 모자라면 대분류 중복을 허용해 채운다
  for (const faction of factionRows) {
    if (selectedFactions.length >= HUB_TAG_LIMIT) break
    if (!selectedFactions.includes(faction) && hasPeople(faction)) selectedFactions.push(faction)
  }

  return selectedFactions.map((faction) => ({
    id: faction.id,
    slug: faction.slug,
    name: faction.name,
    name_en: faction.name_en,
    description: faction.description,
    description_en: faction.description_en,
    color: faction.color,
    cover: coverOf(faction),
  }))
}

const getCachedFactionHubPreviews = unstable_cache(
  fetchFactionHubPreviews,
  ['faction-hub-previews-v2'],
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS],
  },
)

export async function getFactionHubPreviews(): Promise<FactionHubPreview[]> {
  return getCachedFactionHubPreviews()
}
