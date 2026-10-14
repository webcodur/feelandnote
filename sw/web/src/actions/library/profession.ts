'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { selectAllPages, selectInChunks } from '@feelandnote/shared/lib/paginate'
import { STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getCelebProfessions } from '@/lib/celeb-professions'
import { getLocale } from 'next-intl/server'
import type { ContentType } from '@/types/database'
import type { ContentJoinRow, LibraryContent, LibraryResult } from './types'
import { CL_SELECT_LIST_WITH_AFFILIATE, flattenLocales } from '@/lib/utils/content-locale'
import { coalesceCacheQuery } from '@/lib/cacheQuery'

interface ProfessionRank { id: string; type: string; title: string; celeb_count: number }
interface RankRow { content_id: string; contents: ContentJoinRow | ContentJoinRow[] | null }

// 순위에 필요한 ID·매체·제목만 모은다. 표지·판본·회원 감상 수는 현재 페이지에서 읽는다.
// URL 길이·병렬 수·행수 제한은 공용 페이지 조회 도우미가 관리한다.
async function fetchProfessionRanks(db: ReturnType<typeof createStaticClient>, celebIds: string[], locale: string) {
  const rows = await selectInChunks<RankRow>(celebIds, async ids => ({
    data: await selectAllPages<RankRow>(async (from, to) => {
      const { data, error } = await db.from('celeb_contents')
        .select('content_id, contents!inner(id, type, content_locales(locale, title))')
        .in('celeb_id', ids).eq('status', 'FINISHED')
        .order('id', { ascending: true }).range(from, to)
      return { data: data as RankRow[] | null, error }
    }),
    error: null,
  }))
  const ranks = new Map<string, ProfessionRank>()
  for (const row of rows) {
    const content = Array.isArray(row.contents) ? row.contents[0] : row.contents
    if (!content) continue
    const rank = ranks.get(content.id)
    if (rank) rank.celeb_count++
    else ranks.set(content.id, {
      id: content.id, type: content.type,
      title: flattenLocales(content.content_locales, locale, content.type).title, celeb_count: 1,
    })
  }
  return [...ranks.values()].sort((a, b) => b.celeb_count - a.celeb_count || a.title.localeCompare(b.title, 'ko') || a.id.localeCompare(b.id))
}

// 직군·언어별 순위 캐시를 매체·페이지 사이에서 재사용한다.
async function fetchProfessionAggregate(
  profession: string,
  locale: string,
): Promise<ProfessionRank[]> {
  const db = createStaticClient()

  const celebProfiles = await selectAllPages<{ id: string }>((from, to) => db
    .from('celebs')
    .select('id')
    .eq('publication_status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
    .eq('profession', profession)
    .order('id', { ascending: true }).range(from, to))
  if (!celebProfiles.length) return []

  const celebIds = celebProfiles.map(p => p.id)

  return fetchProfessionRanks(db, celebIds, locale)
}

const getProfessionAggregateCached = unstable_cache(
  fetchProfessionAggregate,
  ['library-profession-ranks-v4'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getLibraryByProfession(params?: {
  profession?: string
  category?: ContentType
  page?: number
  limit?: number
}): Promise<LibraryResult> {
  const locale = await getLocale()
  const profession = params?.profession || 'entrepreneur'
  const page = params?.page || 1
  const limit = params?.limit || 12

  const ranks = await coalesceCacheQuery(JSON.stringify(['profession-ranks', profession, locale]),
    () => getProfessionAggregateCached(profession, locale))

  // 직군 전체 집계 캐시를 재사용하고, 요청 카테고리를 적용한 뒤 현재 페이지만 분리한다.
  const filteredContents = params?.category
    ? ranks.filter(content => content.type === params.category)
    : ranks
  const start = (page - 1) * limit
  const pageRanks = filteredContents.slice(start, start + limit)
  const pageIds = pageRanks.map(c => c.id)
  let pageContents: LibraryContent[] = []

  if (pageIds.length) {
    const db = createStaticClient()
    // 현재 페이지의 판본·제휴 링크와 인원 수만 두 조회로 가져온다.
    const [metadata, counts] = await Promise.all([
      db.from('contents').select(`id, type, content_locales(${CL_SELECT_LIST_WITH_AFFILIATE})`).in('id', pageIds),
      db.rpc('get_content_celeb_user_counts', { p_content_ids: pageIds }),
    ])
    throwOnQueryError('getLibraryByProfession 작품 조회', metadata.error)
    throwOnQueryError('getLibraryByProfession 감상 수 조회', counts.error)
    const byId = new Map((metadata.data ?? []).map(row => [row.id, row as ContentJoinRow]))
    const countRows = (counts.data ?? []) as Array<{ content_id: string; celeb_count: number; user_count: number }>
    const countMap = new Map(countRows.map(row => [row.content_id, row]))
    pageContents = pageRanks.flatMap(rank => {
      const content = byId.get(rank.id)
      if (!content) return []
      const flat = flattenLocales(content.content_locales, locale, content.type)
      const count = countMap.get(rank.id)
      return [{ ...flat, id: rank.id, type: content.type,
        celeb_count: Number(count?.celeb_count ?? rank.celeb_count),
        user_count: Number(count?.user_count ?? 0), avg_rating: null }]
    })
  }

  return {
    contents: pageContents,
    total: filteredContents.length,
    totalPages: Math.ceil(filteredContents.length / limit),
    currentPage: page,
  }
}

async function fetchProfessionContentCounts(): Promise<Array<{ profession: string; count: number }>> {
  const db = createStaticClient()

  const results = await Promise.all(
    (await getCelebProfessions()).map(async ({ value: profession }) => {
      const { count, error } = await db
        .from('celebs')
        .select('id', { count: 'exact', head: true })
        .eq('publication_status', 'active')
        // 신화·관계 인물은 목록에서 제외
        .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
        .eq('profession', profession)

      throwOnQueryError('getProfessionContentCounts', error)

      return count && count > 0 ? { profession, count } : null
    })
  )

  return results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.count - a.count)
}

const getProfessionContentCountsCached = unstable_cache(
  fetchProfessionContentCounts,
  ['profession-content-counts-v2'],
  // celebs만 센다
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)

export async function getProfessionContentCounts() {
  return coalesceCacheQuery('classics-profession-counts', () => getProfessionContentCountsCached())
}
