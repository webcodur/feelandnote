'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'

export interface SpotlightTagName {
  name: string
  name_en: string | null
}

// slug → 테마명 (상단 배너 breadcrumb용). 가벼운 단건 조회 + 캐싱.
const getCached = unstable_cache(
  async (slug: string): Promise<SpotlightTagName | null> => {
    const supabase = createStaticClient()
    const { data } = await supabase
      .from('celeb_tags')
      .select('name, name_en')
      .eq('slug', slug)
      .maybeSingle()
    return data ?? null
  },
  ['spotlight-tag-name'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)

export async function getSpotlightTagName(slug: string): Promise<SpotlightTagName | null> {
  if (!slug) return null
  return getCached(slug)
}
