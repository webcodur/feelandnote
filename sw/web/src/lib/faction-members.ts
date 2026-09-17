/**
 * 도감 배정 뷰(faction_member_rows) 공통 읽기 — 숨김을 뺀 배정을 끝까지 받는다.
 *
 * PostgREST는 한 응답을 1,000행에서 자른다. 명단을 한 번에 읽던 세 곳(세력도감 대문·허브·신화 화면)이
 * 테마 전원 공개(26.09.14) 뒤 3천 행을 넘자, 모든 테마가 차례 앞쪽 몇 명만 받았다.
 * 여러 세력을 한꺼번에 읽는 곳은 이 함수를 쓴다. 한 인물·한 세력만 읽는 조회는 1,000행에 닿지 않아 그대로 둔다.
 *
 * lv2Ids를 .in()으로 넘기지 않고 받은 뒤 거른다 — 세력이 수백 개면 URL 길이 한도에 걸린다.
 */
import { MEMBER_PAGE_ORDER } from '@feelandnote/shared/lib/faction-members'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createStaticClient } from '@/lib/db/static'

type FactionDb = ReturnType<typeof createStaticClient>

export async function selectVisibleFactionMembers<T extends { lv2_id: string }>(
  db: FactionDb,
  columns: string,
  lv2Ids?: Iterable<string>,
): Promise<T[]> {
  const rows = await selectAllPages<T>((from, to) => {
    let query = db.from('faction_member_rows').select(columns).eq('hidden', false)
    for (const key of MEMBER_PAGE_ORDER) query = query.order(key, { ascending: true })
    return query.range(from, to).overrideTypes<T[], { merge: false }>()
  })
  if (!lv2Ids) return rows
  const wanted = new Set(lv2Ids)
  return rows.filter((row) => wanted.has(row.lv2_id))
}
