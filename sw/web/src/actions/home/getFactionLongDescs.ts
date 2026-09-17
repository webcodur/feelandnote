'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LIST_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

/** 인물 id → 이 테마에서의 긴 소개 */
export type FactionLongDescs = Record<string, { ko: string | null; en: string | null }>

interface LongDescRow {
  celeb_id: string
  long_desc: string | null
  long_desc_en: string | null
}

/*
  세력도감 인물의 긴 소개 — 테마 하나 몫만 읽는다.
  전 테마 명단(getFeaturedFactions)에 함께 싣던 때 긴 소개가 2.2MB를 차지해 명단이 캐시 상한 2MB를 넘었고,
  캐시되지 못한 명단을 세력도감·인물 상세가 요청마다 다시 읽었다(26.09.15 실측 3.2MB).
  긴 소개는 고른 인물의 화보 아래에만 뜨므로 쇼케이스가 테마를 열 때 받아 간다.
*/
const getCachedFactionLongDescs = unstable_cache(
  async (factionId: string): Promise<FactionLongDescs> => {
    const db = createStaticClient()
    const { data, error } = await db
      .from('faction_member_rows')
      .select('celeb_id, long_desc, long_desc_en')
      .eq('lv2_id', factionId)
      .eq('hidden', false)
      .overrideTypes<LongDescRow[], { merge: false }>()

    if (error) throw new Error(error.message)
    return Object.fromEntries(
      (data ?? []).map((row) => [row.celeb_id, { ko: row.long_desc, en: row.long_desc_en }]),
    )
  },
  ['faction-long-descs-v1'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.FACTIONS] },
)

export async function getFactionLongDescs(factionId: string): Promise<FactionLongDescs> {
  return getCachedFactionLongDescs(factionId)
}
