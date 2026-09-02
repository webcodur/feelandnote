'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

export interface FactionTagName {
  name: string
  name_en: string | null
}

// slug → 테마명 (상단 배너 breadcrumb용). 가벼운 단건 조회 + 캐싱.
const getCached = unstable_cache(
  async (slug: string): Promise<FactionTagName | null> => {
    const db = createStaticClient()
    const { data } = await db
      .from('celeb_tags')
      .select('name, name_en')
      .eq('slug', slug)
      .maybeSingle()
    return data ?? null
  },
  ['faction-tag-name'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.TAGS] }
)

export async function getFactionTagName(slug: string): Promise<FactionTagName | null> {
  if (!slug) return null
  return getCached(slug)
}
