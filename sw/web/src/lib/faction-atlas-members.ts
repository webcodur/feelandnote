/**
 * 세력 명단 뷰(faction_atlas_members) 공통 읽기 — 숨김을 뺀 배정을 끝까지 받는다.
 *
 * PostgREST는 한 응답을 1,000행에서 자른다. 명단을 한 번에 읽던 세 곳(세력도감 대문·허브·신화 화면)이
 * 테마 전원 공개(26.09.14) 뒤 3천 행을 넘자, 모든 테마가 차례 앞쪽 몇 명만 받았다.
 * 여러 테마를 한꺼번에 읽는 곳은 이 함수를 쓴다. 한 인물·한 테마만 읽는 조회는 1,000행에 닿지 않아 그대로 둔다.
 *
 * tagIds를 .in()으로 넘기지 않고 받은 뒤 거른다 — 테마가 수백 개면 URL 길이 한도에 걸린다.
 */
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { ATLAS_MEMBER_PAGE_ORDER, mythBranchTagIds } from '@feelandnote/shared/lib/faction-atlas'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { LIST_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

type AtlasDb = ReturnType<typeof createStaticClient>

export async function selectVisibleAtlasMembers<T extends { tag_id: string }>(
  db: AtlasDb,
  columns: string,
  tagIds?: Iterable<string>,
): Promise<T[]> {
  const rows = await selectAllPages<T>((from, to) => {
    let query = db.from('faction_atlas_members').select(columns).eq('hidden', false)
    for (const key of ATLAS_MEMBER_PAGE_ORDER) query = query.order(key, { ascending: true })
    return query.range(from, to).overrideTypes<T[], { merge: false }>()
  })
  if (!tagIds) return rows
  const wanted = new Set(tagIds)
  return rows.filter((row) => wanted.has(row.tag_id))
}

interface TagNodeRow {
  id: string
  slug: string | null
  parent_id: string | null
}

/**
 * 신화 갈래(최상위와 모든 자손)의 태그 id. 세력도감 명단을 읽지 않는 곳(인물 상세 등)이 신화 소속을 가를 때 쓴다.
 * 태그 표 전체로 가려내야 자손이 빠짐없이 걸린다. 태그가 바뀌면 TAGS로 비운다.
 */
export const getMythBranchTagIds = unstable_cache(
  async (): Promise<string[]> => {
    const db = createStaticClient()
    const tags = await selectAllPages<TagNodeRow>((from, to) =>
      db
        .from('celeb_tags')
        .select('id, slug, parent_id')
        .order('id', { ascending: true })
        .range(from, to)
        .overrideTypes<TagNodeRow[], { merge: false }>(),
    )
    return [...mythBranchTagIds(tags)]
  },
  ['myth-branch-tag-ids-v1'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.TAGS] },
)
