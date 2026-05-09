'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'

export interface TagSearchResult {
  id: string
  name: string
  postCount: number
}

interface SearchTagsParams {
  query: string
  page?: number
  limit?: number
}

interface SearchTagsResponse {
  items: TagSearchResult[]
  total: number
  hasMore: boolean
}

async function fetchSearchTags(
  query: string,
  page: number,
  limit: number,
): Promise<SearchTagsResponse> {
  const supabase = createStaticClient()
  const offset = (page - 1) * limit

  const { data: tags, count, error } = await supabase
    .from('tags')
    .select('id, name, post_count', { count: 'exact' })
    .ilike('name', `%${query}%`)
    .range(offset, offset + limit - 1)
    .order('post_count', { ascending: false })

  if (error) {
    console.error('태그 검색 에러:', error)
    return { items: [], total: 0, hasMore: false }
  }

  const items: TagSearchResult[] = (tags || []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    postCount: tag.post_count || 0,
  }))

  const total = count || 0

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  }
}

const searchTagsCached = unstable_cache(
  fetchSearchTags,
  ['search-tags'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function searchTags({
  query,
  page = 1,
  limit = 20,
}: SearchTagsParams): Promise<SearchTagsResponse> {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }
  return searchTagsCached(query.trim(), page, limit)
}
