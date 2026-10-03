'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { getLocale } from 'next-intl/server'
import { cachedList } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectVisibleFactionMembers } from '@/lib/faction-members'

interface FactionSearchRow {
  id: string
  slug: string | null
  name: string
  name_en: string | null
  headline: string | null
  headline_en: string | null
  is_myth: boolean
  published: boolean
  is_featured: boolean
}

export interface FactionSearchResult {
  id: string
  title: string
  subtitle: string | null
  isMyth: boolean
  href: string
}

async function fetchSearchIndex(): Promise<FactionSearchRow[]> {
  const db = createStaticClient()
  const [rows, members] = await Promise.all([
    selectAllPages<FactionSearchRow>((from, to) => db.from('faction_lv2')
      .select('id, slug, name, name_en, headline, headline_en, is_myth, published, is_featured')
      .not('slug', 'is', null)
      .order('sort_order').order('id').range(from, to)),
    selectVisibleFactionMembers<{ lv2_id: string }>(db, 'lv2_id'),
  ])
  const withMembers = new Set(members.map((member) => member.lv2_id))
  return rows.filter((row) => row.slug && withMembers.has(row.id) &&
    (row.is_myth ? row.published : row.is_featured))
}

const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '')

/** 세력·신화 이름을 한영으로 찾는다. 도감에서 열 수 있는 항목만 가벼운 색인에 담는다. */
export async function searchFactions({ query, page = 1, limit = 20 }: {
  query: string; page?: number; limit?: number
}): Promise<{ items: FactionSearchResult[]; total: number; hasMore: boolean }> {
  const needle = normalize(query.trim())
  if (!needle) return { items: [], total: 0, hasMore: false }
  const locale = await getLocale()
  const rows = await cachedList(CACHE_TAGS.FACTIONS, ['faction-search-index-v1'], fetchSearchIndex)
  const names = (row: FactionSearchRow) => [row.name, row.name_en, row.slug].filter(Boolean).map((name) => normalize(name!))
  const rank = (row: FactionSearchRow) => names(row).some((name) => name === needle) ? 0
    : names(row).some((name) => name.startsWith(needle)) ? 1 : 2
  const hits = rows.filter((row) => names(row).some((name) => name.includes(needle)))
    .sort((a, b) => rank(a) - rank(b))
  const pageSize = Math.min(50, Math.max(1, Math.floor(limit)))
  const offset = (Math.max(1, Math.floor(page)) - 1) * pageSize
  const items = hits.slice(offset, offset + pageSize).map((row) => ({
    id: row.id,
    title: locale === 'en' ? row.name_en?.trim() || row.name : row.name,
    subtitle: (locale === 'en' ? row.headline_en : row.headline)?.trim() || null,
    isMyth: row.is_myth,
    href: `/explore/${row.is_myth ? 'myth' : 'faction'}/${row.slug}`,
  }))
  return { items, total: hits.length, hasMore: offset + pageSize < hits.length }
}
