'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function searchTags({
  query,
  page = 1,
  limit = 20,
}: SearchTagsParams): Promise<SearchTagsResponse> {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }

  const supabase = await createClient()
  const offset = (page - 1) * limit

  // 태그 검색 (tags 테이블이 있다고 가정)
  // 실제 테이블 구조에 맞게 수정 필요
  const { data: tags, count, error } = await supabase
    .from('tags')
    .select('id, name, post_count', { count: 'exact' })
    .ilike('name', `%${query}%`)
    .range(offset, offset + limit - 1)
    .order('post_count', { ascending: false })

  if (error) {
    // 테이블이 없을 경우 빈 결과 반환
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
