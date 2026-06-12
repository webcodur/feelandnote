'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { Profile } from '@/types/database'

interface GetCelebProfilesParams {
  profession?: string
  search?: string
  limit?: number
  offset?: number
}

// 캐시 inner: primitive 인자만 (캐시 키 안정화)
async function fetchCelebProfiles(profession: string, search: string, limit: number, offset: number) {
  const supabase = createStaticClient()

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (profession) {
    query = query.eq('profession', profession)
  }

  if (search) {
    query = query.or(`nickname.ilike.%${search}%,nickname_en.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Get celeb profiles error:', error)
    throw new Error('셀럽 목록을 불러오는데 실패했습니다')
  }

  return {
    items: data as Profile[],
    total: count ?? 0,
    hasMore: (offset + limit) < (count ?? 0)
  }
}

const getCachedCelebProfiles = unstable_cache(
  fetchCelebProfiles,
  ['celeb-profiles'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getCelebProfiles(params: GetCelebProfilesParams = {}) {
  const { profession, search, limit = 20, offset = 0 } = params
  return getCachedCelebProfiles(profession ?? '', search ?? '', limit, offset)
}
