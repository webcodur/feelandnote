'use server'

import { createClient } from '@/lib/db/server'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'

export interface FactionFilterEntry {
  id: string
  name: string
  level: 1 | 2
  lv1_id: string | null
}

// 검색 필터에는 이름·소속만 쓴다. 도감 편집용 설명·화보를 매번 내려받지 않는다.
export async function getFactionFilterEntries(): Promise<FactionFilterEntry[]> {
  const db = await createClient()
  const [sections, factions] = await Promise.all([
    selectAllPages<{ id: string; name: string }>((from, to) => db.from('faction_lv1')
      .select('id,name').order('sort_order').order('name').order('id').range(from, to)),
    selectAllPages<{ id: string; name: string; lv1_id: string }>((from, to) => db.from('faction_lv2')
      .select('id,name,lv1_id').order('sort_order').order('name').order('id').range(from, to)),
  ])
  return [
    ...sections.map((entry) => ({ ...entry, level: 1 as const, lv1_id: null })),
    ...factions.map((entry) => ({ ...entry, level: 2 as const })),
  ]
}
