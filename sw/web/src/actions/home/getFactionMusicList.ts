'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { mythBranchTagIds } from '@feelandnote/shared/lib/faction-atlas'
import { LIST_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { toFactionMusic } from '@/lib/faction-videos'

export interface FactionMusicListItem {
  id: string
  name: string
  name_en: string | null
  slug: string | null
  url: string
  file: string
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
