'use server'

import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

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
  title_ko?: string | null
  title_en?: string | null
  creator_en?: string | null
  isbn_en?: string | null
  thumbnail_en?: string | null
  has_en_edition?: boolean | null
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
  content_locales?: ContentLocaleRow[] | null
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

  // 2-step 검색: content_locales에서 먼저 content_id 검색
  const { data: matchIds } = await supabase
    .from('content_locales')
    .select('content_id')
    .ilike('title', `%${query}%`)
  if (!matchIds?.length) return { items: [], total: 0, hasMore: false }
  const searchContentIds = [...new Set(matchIds.map(m => m.content_id))]

  // 내 기록에서 검색 (rating 포함)
  let searchQuery = supabase
    .from('user_contents')
    .select(`
      id,
      content_id,
      status,
      rating,
      content:contents!inner(
        id, type, user_count,
        content_locales(${CL_SELECT_LIST})
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .in('content_id', searchContentIds)
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
  const locale = await getLocale()
  let items: RecordsSearchResult[] = ((data || []) as UserContentRow[])
    .filter((item): item is UserContentRow & { content: ContentData } => {
      if (!item.content) return false
      // content가 배열인 경우 첫 번째 요소 사용
      const content = Array.isArray(item.content) ? item.content[0] : item.content
      return content !== undefined
    })
    .map((item) => {
      const content = Array.isArray(item.content) ? item.content[0] : item.content
      const flat = flattenLocales((content as any).content_locales as ContentLocaleRow[] | null, locale)
      return {
        id: item.id,
        contentId: item.content_id,
        title: flat.title,
        creator: flat.creator || '',
        category: content.type?.toLowerCase() || 'book',
        thumbnail: flat.thumbnail_url || undefined,
        status: item.status,
        rating: item.rating || undefined,
        userCount: content.user_count || undefined,
        title_ko: flat.title_ko,
        title_en: flat.title_en,
        creator_en: flat.creator_en,
        isbn_en: flat.isbn_en,
        thumbnail_en: flat.thumbnail_en,
        has_en_edition: flat.has_en_edition,
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
