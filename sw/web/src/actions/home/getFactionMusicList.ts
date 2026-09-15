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

async function fetchFactionMusicList(): Promise<FactionMusicListItem[]> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celeb_tags')
    .select('id, name, name_en, slug, theme_music, is_featured, parent_id, sort_order')
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as TagRow[]
  const mythIds = mythBranchTagIds(rows)

  return rows
    .filter((row) => !mythIds.has(row.id))
    .map((row) => {
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
    })
    .filter((row): row is FactionMusicListItem => row !== null)
}

const getCachedFactionMusicList = unstable_cache(
  fetchFactionMusicList,
  ['faction-music-list-v1'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.TAGS] },
)

export async function getFactionMusicList(): Promise<FactionMusicListItem[]> {
  return getCachedFactionMusicList()
}
