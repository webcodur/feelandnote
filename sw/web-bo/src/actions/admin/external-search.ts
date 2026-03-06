'use server'

import { searchExternal, type ExternalSearchResult } from '@feelandnote/content-search/unified-search'
import type { ContentType } from '@feelandnote/content-search/types'
import { createClient } from '@/lib/supabase/server'

// 외부 API 검색
export async function searchExternalContent(
  contentType: ContentType,
  query: string,
  page: number = 1,
  options: { preferGoogle?: boolean } = {}
): Promise<{
  success: boolean
  items?: ExternalSearchResult[]
  total?: number
  hasMore?: boolean
  error?: string
}> {
  try {
    // 기본은 네이버, 필요 시 구글로 전환
    const result = await searchExternal(contentType, query, page, { preferGoogle: options.preferGoogle ?? false })
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
    const supabase = await createClient()

    // external_id로 기존 콘텐츠 확인
    const { data: existing } = await supabase
      .from('contents')
      .select('id')
      .eq('external_id', input.externalId)
      .maybeSingle()

    if (existing) {
      return { success: true, contentId: existing.id }
    }

    // 새 콘텐츠 생성 (id 자동 생성, external_id에 외부 ID 저장)
    const { data: newContent, error } = await supabase
      .from('contents')
      .insert({
        title: input.title,
        creator: input.creator || null,
        type: contentType,
        thumbnail_url: input.coverImageUrl,
        external_source: input.externalSource,
        external_id: input.externalId,
        metadata: input.metadata || {},
      })
      .select('id')
      .single()

    if (error || !newContent) {
      console.error('[createContentFromExternal] Insert error:', error)
      return { success: false, error: error?.message ?? 'Insert failed' }
    }

    // content_locales 듀얼 라이트
    const locale = (['naver_book', 'qnet', 'tmdb'].includes(input.externalSource || '')) ? 'ko' : 'en'
    await supabase.from('content_locales').insert({
      content_id: newContent.id,
      locale,
      title: input.title,
      creator: input.creator || null,
      thumbnail_url: input.coverImageUrl || null,
      sources: { primary: input.externalSource || 'unknown' },
      verified: true,
    })

    return { success: true, contentId: newContent.id }
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
