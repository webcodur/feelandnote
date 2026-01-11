'use server'

import { searchExternal, type ContentType, type ExternalSearchResult } from '@feelnnote/api-clients'
import { createClient } from '@/lib/supabase/server'

// UUID 생성 함수
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 외부 API 검색
export async function searchExternalContent(
  contentType: ContentType,
  query: string,
  page: number = 1
): Promise<{
  success: boolean
  items?: ExternalSearchResult[]
  total?: number
  hasMore?: boolean
  error?: string
}> {
  try {
    const result = await searchExternal(contentType, query, page)
    return {
      success: true,
      items: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '검색에 실패했습니다.',
    }
  }
}

// 외부 검색 결과를 DB에 콘텐츠로 등록
// Server Action 직렬화 문제를 피하기 위해 단순 객체로 받음
interface CreateContentInput {
  externalId: string
  externalSource: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

export async function createContentFromExternal(
  input: CreateContentInput,
  contentType: ContentType
): Promise<{
  success: boolean
  contentId?: string
  error?: string
}> {
  try {
    console.log('[createContentFromExternal] Input:', input)

    const supabase = await createClient()

    // 이미 등록된 콘텐츠인지 확인 (external_id로)
    const { data: existing } = await supabase
      .from('contents')
      .select('id')
      .eq('external_id', input.externalId)
      .maybeSingle()

    if (existing) {
      console.log('[createContentFromExternal] Found existing:', existing.id)
      return { success: true, contentId: existing.id }
    }

    // 새 콘텐츠 생성
    const contentId = generateUUID()

    console.log('[createContentFromExternal] Creating content:', {
      contentId,
      title: input.title,
      type: contentType,
    })

    const { error } = await supabase
      .from('contents')
      .insert({
        id: contentId,
        title: input.title,
        creator: input.creator || null,
        type: contentType,
        thumbnail_url: input.coverImageUrl,
        external_id: input.externalId,
        external_source: input.externalSource,
        metadata: input.metadata || {},
      })

    if (error) {
      console.error('[createContentFromExternal] Insert error:', error)
      return { success: false, error: error.message }
    }

    console.log('[createContentFromExternal] Success, contentId:', contentId)
    return { success: true, contentId }
  } catch (err) {
    console.error('[createContentFromExternal] Exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : '콘텐츠 생성 중 오류 발생'
    }
  }
}

// DB 내 콘텐츠 검색
export async function searchDbContent(
  query: string,
  contentType?: ContentType
): Promise<{
  success: boolean
  items?: Array<{
    id: string
    title: string
    type: string
    creator: string | null
    thumbnail_url: string | null
  }>
  error?: string
}> {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('contents')
    .select('id, title, type, creator, thumbnail_url')
    .ilike('title', `%${query}%`)
    .limit(20)

  if (contentType) {
    dbQuery = dbQuery.eq('type', contentType)
  }

  const { data, error } = await dbQuery

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, items: data || [] }
}
