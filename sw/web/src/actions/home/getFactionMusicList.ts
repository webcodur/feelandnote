'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LIST_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { toFactionMusic } from '@/lib/faction-music'

export interface FactionMusicTheme {
  id: string
  name: string
  name_en: string | null
  slug: string | null
}

export interface FactionMusicListItem {
  id: string
  name: string
  name_en: string | null
  slug: string | null
  url: string
  file: string
  theme: FactionMusicTheme | null
}

interface Lv2Row {
  id: string
  lv1_id: string
  name: string
  name_en: string | null
  slug: string | null
  theme_music: unknown
  is_featured: boolean | null
  is_myth: boolean | null
}

interface ThemeMusicLists {
  faction: FactionMusicListItem[]
  myth: FactionMusicListItem[]
}

async function fetchThemeMusicLists(): Promise<ThemeMusicLists> {
  const db = createStaticClient()
  const [lv2Result, lv1Result] = await Promise.all([
    db.from('faction_lv2')
      .select('id, lv1_id, name, name_en, slug, theme_music, is_featured, is_myth')
      .order('sort_order', { ascending: true }),
    db.from('faction_lv1')
      .select('id, name, name_en, slug'),
  ])

  if (lv2Result.error) throw new Error(lv2Result.error.message)
  if (lv1Result.error) throw new Error(lv1Result.error.message)

  const rows = (lv2Result.data ?? []) as Lv2Row[]
  const lv1ById = new Map((lv1Result.data ?? []).map((row) => [row.id, row]))

  const toMusicItem = (row: Lv2Row): FactionMusicListItem | null => {
      const music = toFactionMusic(row.theme_music)
      if (!music) return null
      const theme = lv1ById.get(row.lv1_id)
      return {
        id: row.id,
        name: row.name,
        name_en: row.name_en,
        slug: row.slug,
        url: music.url,
        file: music.file,
        theme: theme
          ? { id: theme.id, name: theme.name, name_en: theme.name_en, slug: theme.slug }
          : null,
      }
  }

  return {
    faction: rows
      .filter((row) => row.is_featured === true && row.is_myth !== true)
      .map(toMusicItem)
      .filter((row): row is FactionMusicListItem => row !== null),
    myth: rows
      .filter((row) => row.is_myth === true)
      .map(toMusicItem)
      .filter((row): row is FactionMusicListItem => row !== null),
  }
}

const getCachedThemeMusicLists = unstable_cache(
  fetchThemeMusicLists,
  ['theme-music-lists-v3'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.FACTIONS] },
)

export async function getFactionMusicList(): Promise<FactionMusicListItem[]> {
  return (await getCachedThemeMusicLists()).faction
}

export async function getMythMusicList(): Promise<FactionMusicListItem[]> {
  return (await getCachedThemeMusicLists()).myth
}
