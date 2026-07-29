'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
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
  celebs: HubProfileRow[]
}

async function fetchFactionHubPreviews(): Promise<FactionHubPreview[]> {
  const supabase = createStaticClient()
  const { data: tags, error: tagsError } = await supabase
    .from('celeb_tags')
    .select('id, name, name_en, description, description_en, color')
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
        .from('celeb_tag_assignments')
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

  const selectedTags = tagRows
    .filter((tag) => (assignmentsByTag.get(tag.id)?.length ?? 0) > 0)
    .slice(0, HUB_TAG_LIMIT)

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
    ...tag,
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
