'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE } from '@/lib/cache'

export interface CelebDirectoryRow {
  slug: string
  nickname: string
  nickname_en: string | null
  profession: string | null
}

async function fetchCelebDirectory(): Promise<CelebDirectoryRow[]> {
  const supabase = createStaticClient()

  const { data } = await supabase
    .from('profiles')
    .select('slug, nickname, nickname_en, profession')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
    .not('slug', 'is', null)
    .order('nickname', { ascending: true })

  return (data ?? []) as CelebDirectoryRow[]
}

export const getCelebDirectory = unstable_cache(
  fetchCelebDirectory,
  ['celeb-directory'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
