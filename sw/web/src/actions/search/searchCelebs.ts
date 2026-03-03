'use server'

import { createClient } from '@/lib/supabase/server'

export interface CelebSearchResult {
  id: string
  slug: string | null
  nickname: string
  avatar_url: string | null
  profession: string | null
  title: string | null
}

interface SearchCelebsParams {
  query: string
  page?: number
  limit?: number
}

interface SearchCelebsResponse {
  items: CelebSearchResult[]
  total: number
  hasMore: boolean
}

export async function searchCelebs({
  query,
  page = 1,
  limit = 20,
}: SearchCelebsParams): Promise<SearchCelebsResponse> {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }

  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data, count, error } = await supabase
    .from('profiles')
    .select('id, slug, nickname, avatar_url, profession, title', { count: 'exact' })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .ilike('nickname', `%${query}%`)
    .range(offset, offset + limit - 1)
    .order('nickname', { ascending: true })

  if (error) {
    console.error('셀럽 검색 에러:', error)
    return { items: [], total: 0, hasMore: false }
  }

  const total = count ?? 0

  return {
    items: (data || []).map(row => ({
      id: row.id,
      slug: row.slug,
      nickname: row.nickname || '',
      avatar_url: row.avatar_url,
      profession: row.profession,
      title: row.title,
    })),
    total,
    hasMore: offset + limit < total,
  }
}
