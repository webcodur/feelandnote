'use server'

import { createClient } from '@/lib/supabase/server'

export interface ArchiveSearchResult {
  id: string
  contentId: string
  title: string
  creator: string
  category: string
  thumbnail?: string
  status: string
  rating?: number
  progress?: number
}

interface SearchArchiveParams {
  query: string
  status?: string
  category?: string
  page?: number
  limit?: number
}

interface SearchArchiveResponse {
  items: ArchiveSearchResult[]
  total: number
  hasMore: boolean
}

interface ContentData {
  id: string
  type: string
  title: string
  creator: string | null
  thumbnail_url: string | null
}

interface UserContentRow {
  id: string
  content_id: string
  status: string
  progress: number | null
  content: ContentData | ContentData[] | null
}

export async function searchArchive({
  query,
  status,
  category,
  page = 1,
  limit = 20,
}: SearchArchiveParams): Promise<SearchArchiveResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { items: [], total: 0, hasMore: false }
  }

  const offset = (page - 1) * limit

  // 내 기록관에서 검색
  let searchQuery = supabase
    .from('user_contents')
    .select(`
      id,
      content_id,
      status,
      progress,
      content:contents!inner(
        id,
        type,
        title,
        creator,
        thumbnail_url
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
    console.error('기록관 검색 에러:', error)
    return { items: [], total: 0, hasMore: false }
  }

  // 평점 조회 (records 테이블에서)
  const contentIds = (data || []).map(item => item.content_id)
  let ratingsMap: Record<string, number> = {}

  if (contentIds.length > 0) {
    const { data: ratings } = await supabase
      .from('records')
      .select('content_id, rating')
      .eq('user_id', user.id)
      .eq('type', 'REVIEW')
      .in('content_id', contentIds)
      .not('rating', 'is', null)

    ;(ratings || []).forEach(r => {
      if (r.rating) ratingsMap[r.content_id] = r.rating
    })
  }

  // 카테고리 필터 (content.type 기준)
  let items: ArchiveSearchResult[] = ((data || []) as UserContentRow[])
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
        rating: ratingsMap[item.content_id],
        progress: item.progress || undefined,
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
