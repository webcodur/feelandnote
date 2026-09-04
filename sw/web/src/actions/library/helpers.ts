import { CategoryId } from '@/constants/categories'
import { CL_SELECT_LIST, flattenLocales } from '@/lib/utils/content-locale'
import { throwOnQueryError } from '@/lib/cache'
import type { CelebContentJoinRow, LibraryContent, StaticDatabaseClient } from './types'

// #region 헬퍼 함수 - 콘텐츠 집계 (페이지네이션 지원)
export function aggregateContents(
  data: Array<{
    content_id: string
    contents: { id: string; title: string; creator: string | null; thumbnail_url: string | null; type: string; title_ko?: string | null; title_en?: string | null; creator_en?: string | null; isbn_en?: string | null; thumbnail_en?: string | null; has_en_edition?: boolean | null } | null
  }>,
  options: {
    category?: CategoryId
    page?: number
    limit?: number
    userCountMap?: Map<string, number>
  } = {}
): { contents: LibraryContent[]; total: number } {
  const { category, page = 1, limit = 12, userCountMap } = options

  const contentMap = new Map<string, LibraryContent>()

  for (const item of data) {
    const content = item.contents
    if (!content) continue
    if (category && content.type !== category) continue

    const existing = contentMap.get(content.id)
    if (existing) {
      existing.celeb_count++
    } else {
      contentMap.set(content.id, {
        id: content.id,
        title: content.title,
        creator: content.creator,
        thumbnail_url: content.thumbnail_url,
        type: content.type as CategoryId,
        celeb_count: 1,
        user_count: userCountMap?.get(content.id) ?? 0,
        avg_rating: null,
        title_ko: content.title_ko ?? null,
        title_en: content.title_en ?? null,
        creator_en: content.creator_en ?? null,
        isbn_en: content.isbn_en ?? null,
        thumbnail_en: content.thumbnail_en ?? null,
        has_en_edition: content.has_en_edition ?? null,
      })
    }
  }

  const allContents = Array.from(contentMap.values())
    .sort((a, b) => {
      if (b.celeb_count !== a.celeb_count) return b.celeb_count - a.celeb_count
      return a.title.localeCompare(b.title, 'ko')
    })

  const total = allContents.length
  const startIndex = (page - 1) * limit
  const paginatedContents = allContents.slice(startIndex, startIndex + limit)

  return { contents: paginatedContents, total }
}
// #endregion

// #region 헬퍼 함수 - 배열을 청크로 분할
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
// #endregion

// #region 헬퍼 함수 - 페이지네이션으로 모든 데이터 조회
export async function fetchAllCelebContents(
  db: StaticDatabaseClient,
  celebIds: string[],
  // 요청 로케일은 unstable_cache 바깥에서 읽어 인자로 전달한다.
  locale: string,
  category?: string
) {
  const PAGE_SIZE = 1000
  const BATCH_SIZE = 50
  const allData: Array<{
    celeb_id: string
    content_id: string
    contents: { id: string; title: string; creator: string | null; thumbnail_url: string | null; type: string; title_ko?: string | null; title_en?: string | null; creator_en?: string | null; isbn_en?: string | null; thumbnail_en?: string | null; has_en_edition?: boolean | null }
  }> = []

  if (!celebIds.length) return allData

  const idBatches = chunkArray(celebIds, BATCH_SIZE)

  for (const batchIds of idBatches) {
    let from = 0
    let hasMore = true

    while (hasMore) {
      let query = db
        .from('celeb_contents')
        .select(`
          celeb_id,
          content_id,
          contents!inner(id, type, content_locales(${CL_SELECT_LIST}))
        `)
        .in('celeb_id', batchIds)
        .eq('status', 'FINISHED')
        .range(from, from + PAGE_SIZE - 1)

      if (category) {
        query = query.eq('contents.type', category)
      }

      const { data, error } = await query

      // break 하면 목록이 조용히 잘린 채 캐시된다 — 통째로 사라지는 것보다 알아채기 어렵다.
      throwOnQueryError('fetchAllCelebContents', error)

      const rows: CelebContentJoinRow[] = data || []
      const typedData = rows.map(item => {
        const raw = Array.isArray(item.contents) ? item.contents[0] : item.contents
        const flat = flattenLocales(raw?.content_locales, locale)
        return {
          celeb_id: item.celeb_id,
          content_id: item.content_id,
          contents: {
            id: raw?.id as string,
            title: flat.title,
            creator: flat.creator,
            thumbnail_url: flat.thumbnail_url,
            type: raw?.type as string,
            title_ko: flat.title_ko,
            title_en: flat.title_en,
            creator_en: flat.creator_en,
            isbn_en: flat.isbn_en,
            thumbnail_en: flat.thumbnail_en,
            has_en_edition: flat.has_en_edition,
          },
        }
      })

      allData.push(...typedData)

      hasMore = data?.length === PAGE_SIZE
      from += PAGE_SIZE
    }
  }

  return allData
}

// Map은 JSON 캐시 경계에서 보존되지 않으므로 unstable_cache로 감싸지 않는다.
// 콘텐츠 ID별 셀럽(active CELEB, FINISHED) 카운트 — RPC로 카운트만 수신
export async function fetchGlobalCelebCounts(
  db: StaticDatabaseClient,
  contentIds: string[]
): Promise<Map<string, number>> {
  if (!contentIds.length) return new Map()

  const { data, error } = await db.rpc('get_celeb_content_counts', {
    p_content_ids: contentIds,
  })

  // 빈 Map 을 돌려주면 인물 수가 전부 0 으로 굳는다.
  throwOnQueryError('fetchGlobalCelebCounts', error)

  const countMap = new Map<string, number>()
  for (const row of data ?? []) {
    countMap.set(row.content_id, Number(row.celeb_count))
  }

  return countMap
}

// Map은 JSON 캐시 경계에서 보존되지 않으므로 unstable_cache로 감싸지 않는다.
// 콘텐츠 ID별 일반 유저(USER, FINISHED) 카운트 — RPC로 카운트만 수신
export async function fetchUserContentCounts(
  db: StaticDatabaseClient,
  category?: string,
  contentIds?: string[]
): Promise<Map<string, number>> {
  if (contentIds !== undefined && !contentIds.length) return new Map()
  if (contentIds?.length) {
    // 한 번에 다 넣으면 배열이 커져 그 RPC도 문 시간을 넘긴다. 나눠 부르고 합친다.
    const CHUNK = 500
    const counts = new Map<string, number>()
    for (let i = 0; i < contentIds.length; i += CHUNK) {
      const { data, error } = await db.rpc('get_content_celeb_user_counts', {
        p_content_ids: contentIds.slice(i, i + CHUNK),
      })
      throwOnQueryError('fetchUserContentCounts', error)
      for (const row of (data ?? []) as Array<{ content_id: string; user_count: number }>) {
        counts.set(row.content_id, Number(row.user_count))
      }
    }
    return counts
  }
  const { data, error } = await db.rpc('get_user_content_counts', {
    p_category: category ?? undefined,
  })

  // 여기서 빈 값을 돌려주면 감상 인원 수가 전부 0 으로 굳는다.
  throwOnQueryError('fetchUserContentCounts', error)

  return new Map<string, number>((data ?? []).map((row: { content_id: string; user_count: number }) => [row.content_id, Number(row.user_count)] as [string, number]))
}
// #endregion
