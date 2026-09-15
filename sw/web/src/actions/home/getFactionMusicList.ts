'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { mythBranchTagIds } from '@feelandnote/shared/lib/faction-atlas'
import { LIST_REVALIDATE } from '@/lib/cache'
import { selectVisibleAtlasMembers } from '@/lib/faction-atlas-members'
import { createStaticClient } from '@/lib/db/static'
import { toFactionMusic } from '@/lib/faction-videos'

export interface FactionMusicGroup {
  name: string
  name_en: string | null
  count: number
}

export interface FactionMusicListItem {
  id: string
  name: string
  name_en: string | null
  slug: string | null
  url: string
  file: string
  factions: FactionMusicGroup[]
}

interface TagRow {
  id: string
  name: string
  name_en: string | null
  slug: string | null
  theme_music: unknown
  is_featured: boolean | null
  parent_id: string | null
  sort_order: number | null
}

interface AtlasMemberGroupRow {
  tag_id: string
  group_label: string | null
  group_label_en: string | null
}

interface ThemeMusicLists {
  faction: FactionMusicListItem[]
  myth: FactionMusicListItem[]
}

async function fetchThemeMusicLists(): Promise<ThemeMusicLists> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celeb_tags')
    .select('id, name, name_en, slug, theme_music, is_featured, parent_id, sort_order')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as TagRow[]
  const mythIds = mythBranchTagIds(rows)
  const memberGroups = await selectVisibleAtlasMembers<AtlasMemberGroupRow>(
    db,
    'tag_id, group_label, group_label_en',
  )
  const groupsByTag = new Map<string, Map<string, FactionMusicGroup>>()
  for (const member of memberGroups) {
    const name = member.group_label?.trim()
    if (!name) continue
    const groups = groupsByTag.get(member.tag_id) ?? new Map<string, FactionMusicGroup>()
    const current = groups.get(name)
    groups.set(name, {
      name,
      name_en: member.group_label_en?.trim() || current?.name_en || null,
      count: (current?.count ?? 0) + 1,
    })
    groupsByTag.set(member.tag_id, groups)
  }

  const toMusicItem = (row: TagRow): FactionMusicListItem | null => {
      const music = toFactionMusic(row.theme_music)
      if (!music) return null
      return {
        id: row.id,
        name: row.name,
        name_en: row.name_en,
        slug: row.slug,
        url: music.url,
        file: music.file,
        factions: [...(groupsByTag.get(row.id)?.values() ?? [])],
      }
  }

  return {
    faction: rows
      .filter((row) => row.is_featured === true && !mythIds.has(row.id))
      .map(toMusicItem)
      .filter((row): row is FactionMusicListItem => row !== null),
    myth: rows
      .filter((row) => mythIds.has(row.id))
      .map(toMusicItem)
      .filter((row): row is FactionMusicListItem => row !== null),
  }
}

const getCachedThemeMusicLists = unstable_cache(
  fetchThemeMusicLists,
  ['theme-music-lists-v2'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.TAGS] },
)

export async function getFactionMusicList(): Promise<FactionMusicListItem[]> {
  return (await getCachedThemeMusicLists()).faction
}

export async function getMythMusicList(): Promise<FactionMusicListItem[]> {
  return (await getCachedThemeMusicLists()).myth
}
