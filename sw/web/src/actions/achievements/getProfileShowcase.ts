'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'

async function fetchProfileShowcase(userId: string): Promise<string[]> {
  const supabase = createStaticClient()
  const { data } = await supabase
    .from('profiles')
    .select('showcase_titles')
    .eq('id', userId)
    .single()

  return ((data?.showcase_titles as string[]) || [])
}

export const getProfileShowcase = unstable_cache(
  fetchProfileShowcase,
  ['profile-showcase'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)
