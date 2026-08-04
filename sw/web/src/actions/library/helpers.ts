import { CategoryId } from '@/constants/categories'
import { CL_SELECT_LIST, flattenLocales } from '@/lib/utils/content-locale'
import type { LibraryContent, StaticSupabase, UserContentJoinRow } from './types'

// #region 헬퍼 함수 - 콘텐츠 집계 (페이지네이션 지원)
export function aggregateContents(
  data: Array<{
    content_id: string
    rating: number | null
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

  const contentMap = new Map<string, {
    content: LibraryContent
    ratings: number[]
  }>()

  for (const item of data) {
    const content = item.contents
    if (!content) continue
    if (category && content.type !== category) continue

    const existing = contentMap.get(content.id)
    if (existing) {
      existing.content.celeb_count++
      if (item.rating) existing.ratings.push(Number(item.rating))
    } else {
      contentMap.set(content.id, {
        content: {
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
        },
        ratings: item.rating ? [Number(item.rating)] : []
      })
    }
  }

  const allContents = Array.from(contentMap.values())
    .map(({ content, ratings }) => ({
      ...content,
      avg_rating: ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null
    }))
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
export async function fetchAllUserContents(
  supabase: StaticSupabase,
  celebIds: string[],
  // 요청 로케일은 unstable_cache 바깥에서 읽어 인자로 전달한다.
  locale: string,
  category?: string
) {
  const PAGE_SIZE = 1000
  const BATCH_SIZE = 50
  const allData: Array<{
    user_id: string
    content_id: string
    rating: number | null
    contents: { id: string; title: string; creator: string | null; thumbnail_url: string | null; type: string; title_ko?: string | null; title_en?: string | null; creator_en?: string | null; isbn_en?: string | null; thumbnail_en?: string | null; has_en_edition?: boolean | null }
  }> = []

  if (!celebIds.length) return allData

  const idBatches = chunkArray(celebIds, BATCH_SIZE)

  for (const batchIds of idBatches) {
    let from = 0
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('user_contents')
        .select(`
          user_id,
          content_id,
          rating,
          contents!inner(id, type, content_locales(${CL_SELECT_LIST}))
        `)
        .in('user_id', batchIds)
        .eq('status', 'FINISHED')
        .range(from, from + PAGE_SIZE - 1)

      if (category) {
        query = query.eq('contents.type', category)
      }

      const { data, error } = await query

      if (error) {
        console.error('fetchAllUserContents error:', error.message, error.code, error.details)
        break
      }

      const rows: UserContentJoinRow[] = data || []
      const typedData = rows.map(item => {
        const raw = Array.isArray(item.contents) ? item.contents[0] : item.contents
        const flat = flattenLocales(raw?.content_locales, locale)
        return {
          user_id: item.user_id,
          content_id: item.content_id,
          rating: item.rating,
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

// ⚠️ Map 반환 — unstable_cache로 감싸지 마라 (Map은 직렬화 불가, §10 tooling-gotchas)
// 콘텐츠 ID별 셀럽(active CELEB, FINISHED) 카운트 — RPC로 카운트만 수신
export async function fetchGlobalCelebCounts(
  supabase: StaticSupabase,
  contentIds: string[]
): Promise<Map<string, number>> {
  if (!contentIds.length) return new Map()

  const { data, error } = await supabase.rpc('get_celeb_content_counts', {
    p_content_ids: contentIds,
  })

  if (error) {
    console.error('fetchGlobalCelebCounts error:', error.message, error.code)
    return new Map()
  }

  const countMap = new Map<string, number>()
  for (const row of data ?? []) {
    countMap.set(row.content_id, Number(row.celeb_count))
  }

  return countMap
}

// ⚠️ Map 반환 — unstable_cache로 감싸지 마라 (Map은 직렬화 불가, §10 tooling-gotchas)
// 콘텐츠 ID별 일반 유저(USER, FINISHED) 카운트 — RPC로 카운트만 수신
export async function fetchUserContentCounts(
  supabase: StaticSupabase,
  category?: string
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>()

  const { data, error } = await supabase.rpc('get_user_content_counts', {
    p_category: category ?? undefined,
  })

  if (error) {
    console.error('fetchUserContentCounts error:', error.message, error.code)
    return countMap
  }

  for (const row of data ?? []) {
    countMap.set(row.content_id, Number(row.user_count))
  }

  return countMap
}
// #endregion
