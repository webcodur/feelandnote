/**
 * 세력도감 테마 안 진영(그룹) 설명 — 뷰(faction_atlas_members)에는 없어 그룹 표를 직접 읽는다.
 * 진영은 이름(뷰의 group_label = 그룹 표의 name)으로 맞춘다. 편집은 백오피스 그룹 편집이 쥔다.
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
  async (tagId: string): Promise<FactionGroupDescription[]> => {
    const db = createStaticClient()
    const { data, error } = await db
      .from('celeb_tag_groups')
      .select('name, description, description_en')
      .eq('tag_id', tagId)
    throwOnQueryError('세력도감 진영 설명', error)
    return (data ?? []) as FactionGroupDescription[]
  },
  ['faction-group-descriptions-v1'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.TAGS] },
)
