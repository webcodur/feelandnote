'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'

async function fetchProfileShowcase(userId: string): Promise<string[]> {
  const supabase = createStaticClient()
  const { data } = await supabase
    .from('member_profiles')
    .select('showcase_titles')
    .eq('id', userId)
    .single()

  return ((data?.showcase_titles as string[]) || [])
}

export const getProfileShowcase = unstable_cache(
  fetchProfileShowcase,
  ['profile-showcase'],
  // 사용자가 직접 고른 칭호 진열이다. BO에 수정 액션이 없어 태그를 두지 않는다.
  { revalidate: STATIC_REVALIDATE }
)
