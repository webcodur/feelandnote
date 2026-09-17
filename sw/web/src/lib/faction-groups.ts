/**
 * 세력 안 그룹 설명 — 뷰(faction_member_rows)에는 없어 그룹 표(faction_lv3)를 직접 읽는다.
 * 그룹은 이름(뷰의 group_name = 그룹 표의 name)으로 맞춘다. 편집은 백오피스 그룹 편집이 쥔다.
 */
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LIST_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

export interface FactionGroupDescription {
  name: string
  description: string | null
  description_en: string | null
}

export const getFactionGroupDescriptions = unstable_cache(
  async (factionId: string): Promise<FactionGroupDescription[]> => {
    const db = createStaticClient()
    const { data, error } = await db
      .from('faction_lv3')
      .select('name, description, description_en')
      .eq('lv2_id', factionId)
    throwOnQueryError('세력도감 진영 설명', error)
    return (data ?? []) as FactionGroupDescription[]
  },
  ['faction-group-descriptions-v1'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.FACTIONS] },
)
