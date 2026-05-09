'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'

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
    .not('slug', 'is', null)
    .order('nickname', { ascending: true })

  return (data ?? []) as CelebDirectoryRow[]
}

export const getCelebDirectory = unstable_cache(
  fetchCelebDirectory,
  ['celeb-directory'],
  { revalidate: 3600, tags: ['celebs'] }
)
