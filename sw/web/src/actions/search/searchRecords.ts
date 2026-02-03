'use server'

import { createClient } from '@/lib/supabase/server'

export interface RecordsSearchResult {
  id: string
  contentId: string
  title: string
  creator: string
  category: string
  thumbnail?: string
  status: string
  rating?: number
  userCount?: number
}

interface SearchRecordsParams {
  query: string
  status?: string
  category?: string
  page?: number
  limit?: number
}

interface SearchRecordsResponse {
  items: RecordsSearchResult[]
  total: number
  hasMore: boolean
}

interface ContentData {
  id: string
  type: string
  title: string
  creator: string | null
  thumbnail_url: string | null
  user_count: number | null
}

interface UserContentRow {
  id: string
  content_id: string
  status: string
  rating: number | null
  content: ContentData | ContentData[] | null
}

export async function searchRecords({
  query,
  status,
  category,
  page = 1,
  limit = 20,
}: SearchRecordsParams): Promise<SearchRecordsResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { items: [], total: 0, hasMore: false }
  }

  const offset = (page - 1) * limit

  // 내 내 기록에서 검색 (rating 포함)
  let searchQuery = supabase
    .from('user_contents')
    .select(`
      id,
      content_id,
      status,
      rating,
      content:contents!inner(
        id,
        type,
        title,
        creator,
        thumbnail_url,
        user_count
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .ilike('content.title', `%${query}%`)
    .range(offset, offset + limit - 1)
    .order('updated_at', { ascending: false })

  // 상태 필터
  if (status && status !== 'all') {
    searchQuery = searchQuery.eq('status', status)
  }

  const { data, count, error } = await searchQuery

  if (error) {
    console.error('내 기록 검색 에러:', error)
    return { items: [], total: 0, hasMore: false }
  }

  // 카테고리 필터 (content.type 기준)
  let items: RecordsSearchResult[] = ((data || []) as UserContentRow[])
    .filter((item): item is UserContentRow & { content: ContentData } => {
      if (!item.content) return false
      // content가 배열인 경우 첫 번째 요소 사용
      const content = Array.isArray(item.content) ? item.content[0] : item.content
      return content !== undefined
    })
    .map((item) => {
      const content = Array.isArray(item.content) ? item.content[0] : item.content
      return {
        id: item.id,
        contentId: item.content_id,
        title: content.title,
        creator: content.creator || '',
        category: content.type?.toLowerCase() || 'book',
        thumbnail: content.thumbnail_url || undefined,
        status: item.status,
        rating: item.rating || undefined,
        userCount: content.user_count || undefined,
      }
    })

  if (category && category !== 'all') {
    items = items.filter(item => item.category === category)
  }

  const total = count || 0

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  }
}
