'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

interface GetCelebProfilesParams {
  category?: string
  search?: string
  limit?: number
  offset?: number
}

export async function getCelebProfiles(params: GetCelebProfilesParams = {}) {
  const supabase = await createClient()
  const { category, search, limit = 20, offset = 0 } = params

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('profile_type', 'CELEB')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.ilike('nickname', `%${search}%`)
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
