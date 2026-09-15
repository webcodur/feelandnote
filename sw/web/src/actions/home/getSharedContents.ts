'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'

export interface SharedContent {
  content_id: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  content_type: string
  celeb_count: number
  avg_rating: number | null
  celeb_nicknames: string[]
}

interface CelebContentRow {
  content_id: string
  celeb_id: string | null
  contents: { type: string } | null
  celebs: { nickname: string | null } | null
}

// 캐시 inner: id 목록 문자열·콘텐츠 타입·개수만 받아 캐시 키를 안정화한다.
// 인물들이 감상한 작품 전체를 대상으로 하며, 한 명만 감상한 작품도 포함한다.
async function fetchSharedContents(
  idsKey: string,
  contentType: string,
  limit: number
): Promise<SharedContent[]> {
  const db = createStaticClient()
  const celebIds = idsKey.split(',')

  // celeb_contents를 페이지로 읽어 JS에서 집계한다 (RPC의 2명 이상 필터를 쓰지 않는다)
  const rows: CelebContentRow[] = []
  for (let from = 0; ; from += 1000) {
    let query = db
      .from('celeb_contents')
      .select('content_id, celeb_id, contents!inner(type), celebs(nickname)')
      .in('celeb_id', celebIds)
      .eq('visibility', 'public')
      .range(from, from + 999)
    if (contentType) query = query.eq('contents.type', contentType)
    const { data, error } = await query
    throwOnQueryError('getSharedContents', error)
    rows.push(...((data ?? []) as unknown as CelebContentRow[]))
    if (!data || data.length < 1000) break
  }

  const byContent = new Map<string, { type: string; celebIds: Set<string>; nicknames: Set<string> }>()
  for (const row of rows) {
    const entry = byContent.get(row.content_id)
      ?? { type: row.contents?.type ?? contentType, celebIds: new Set<string>(), nicknames: new Set<string>() }
    if (row.celeb_id) entry.celebIds.add(row.celeb_id)
    const nickname = row.celebs?.nickname
    if (nickname) entry.nicknames.add(nickname)
    byContent.set(row.content_id, entry)
  }

  const top = [...byContent.entries()]
    .map(([id, e]) => ({ id, type: e.type, count: e.celebIds.size, nicknames: [...e.nicknames].sort() }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit)
  if (top.length === 0) return []

  const { data: locales, error: localeError } = await db
    .from('content_locales')
    .select('content_id, title, creator, thumbnail_url')
    .in('content_id', top.map((t) => t.id))
    .eq('locale', 'ko')
  throwOnQueryError('getSharedContents', localeError)
  const localeById = new Map((locales ?? []).map((l) => [l.content_id, l]))

  return top.map((t) => {
    const locale = localeById.get(t.id)
    return {
      content_id: t.id,
      title: locale?.title ?? null,
      creator: locale?.creator ?? null,
      thumbnail_url: locale?.thumbnail_url ?? null,
      content_type: t.type,
      celeb_count: t.count,
      avg_rating: null,
      celeb_nicknames: t.nicknames,
    }
  })
}

const getCachedSharedContents = unstable_cache(
  fetchSharedContents,
  ['shared-contents'],
  // celeb_contents를 직접 집계해 셀럽들이 감상한 콘텐츠를 뽑는다
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getSharedContents(
  celebIds: string[],
  contentType?: string,
  limit = 10
): Promise<SharedContent[]> {
  if (celebIds.length === 0) return []
  return withQueryFallback(
    'getSharedContents',
    () => getCachedSharedContents(celebIds.join(','), contentType ?? '', limit),
    [],
  )
}
