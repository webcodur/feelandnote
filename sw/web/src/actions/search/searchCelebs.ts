'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedList, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { findCelebsByName } from '@/lib/celeb/celebNameSearchIndex'
import { createStaticClient } from '@/lib/db/static'
import { getLocale } from 'next-intl/server'

interface CelebSearchResult {
  id: string
  slug: string | null
  nickname: string
  avatar_url: string | null
  profession: string | null
  title: string | null
  /** 이름이 아니라 다른 이름(별칭)으로 걸렸으면 그 이름 */
  matched_alias: string | null
}

interface SearchCelebsParams {
  query: string
  page?: number
  limit?: number
}

interface SearchCelebsResponse {
  items: CelebSearchResult[]
  total: number
  hasMore: boolean
}

/** 한 번에 돌려주는 최대 인원 — 검색 창은 대여섯 명만 보여 준다 */
const MAX_LIMIT = 50

const EMPTY: SearchCelebsResponse = { items: [], total: 0, hasMore: false }

interface CelebCardRow {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  title: string | null
  title_en: string | null
}

async function fetchCelebCards(ids: string[]): Promise<CelebCardRow[]> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celebs')
    .select('id, slug, nickname, nickname_en, avatar_url, profession, title, title_en')
    .in('id', ids)
    .eq('publication_status', 'active')
  throwOnQueryError('셀럽 검색 카드', error)
  return data ?? []
}

/**
 * 인물 이름 검색. 띄어쓰기·표기 흔들림(래/레, 다니엘/대니얼)을 견디는 판정은 이름 색인이 맡고,
 * 여기서는 가까운 순서 그대로 한 쪽만큼 카드를 붙인다. 실존 축은 가리지 않는다(가상 인물도 검색된다).
 */
export async function searchCelebs({
  query,
  page = 1,
  limit = 20,
}: SearchCelebsParams): Promise<SearchCelebsResponse> {
  if (!query.trim()) return EMPTY
  const locale = await getLocale()
  const isEn = locale === 'en'
  const pageSize = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT)
  const offset = (Math.max(1, Math.floor(page)) - 1) * pageSize

  return withQueryFallback('searchCelebs', async () => {
    const hits = await findCelebsByName(query)
    const pageHits = hits.slice(offset, offset + pageSize)
    const pageIds = pageHits.map((hit) => hit.id)
    if (!pageIds.length) return { items: [], total: hits.length, hasMore: false }
    const aliasById = new Map(pageHits.map((hit) => [hit.id, hit.matchedAlias]))

    const rows = await cachedList(CACHE_TAGS.CELEBS, ['celeb-search-cards-v1', ...pageIds], () => fetchCelebCards(pageIds))
    const rowById = new Map(rows.map((row) => [row.id, row]))
    const items = pageIds.flatMap((id) => {
      const row = rowById.get(id)
      if (!row) return []
      return [{
        id: row.id,
        slug: row.slug,
        nickname: isEn ? (row.nickname_en || row.nickname || '') : (row.nickname || ''),
        avatar_url: row.avatar_url,
        profession: row.profession,
        title: isEn ? (row.title_en || row.title) : row.title,
        matched_alias: aliasById.get(id) ?? null,
      }]
    })
    return { items, total: hits.length, hasMore: offset + pageSize < hits.length }
  }, EMPTY)
}
