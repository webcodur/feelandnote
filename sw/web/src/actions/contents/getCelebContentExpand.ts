'use server'

import { unstable_cache } from 'next/cache'
import { getLocale } from 'next-intl/server'
import {
  CACHE_TAGS,
  detailCacheTags,
} from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail, spreadRevalidate, STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { CL_SELECT_LIST_WITH_AFFILIATE } from '@/lib/utils/content-locale'
import { sanitizeSearchTerm } from '@/lib/utils/search-sanitize'
import type { ContentType } from '@/types/database'
import type { GetUserContentsResponse, UserContentPublic } from './getUserContents'
import { mapCelebIndexRow, mapCelebRecordRow } from './celebContentExpandRows'

interface CelebIndexParams {
  userId: string
  type?: ContentType
  page?: number
  limit?: number
  search?: string
  hasReview?: boolean
}

async function findSearchIds(search?: string): Promise<string[] | null> {
  const safeSearch = search ? sanitizeSearchTerm(search) : ''
  if (safeSearch.length < 2) return null
  const { data, error } = await createStaticClient()
    .from('content_locales')
    .select('content_id')
    .or(`title.ilike.%${safeSearch}%,creator.ilike.%${safeSearch}%`)
  throwOnQueryError('celeb content index search', error)
  return [...new Set((data ?? []).map((row) => row.content_id))]
}

async function fetchIndex(
  params: Required<Pick<CelebIndexParams, 'userId' | 'page' | 'limit'>> & CelebIndexParams,
  locale: string,
): Promise<GetUserContentsResponse> {
  const searchIds = await findSearchIds(params.search)
  if (searchIds?.length === 0) {
    return { items: [], total: 0, page: params.page, totalPages: 0, hasMore: false }
  }
  const offset = (params.page - 1) * params.limit
  const contentFields = `id, type, content_locales(${CL_SELECT_LIST_WITH_AFFILIATE}, isbn)`
  let query = createStaticClient()
    .from('celeb_contents')
    .select(`id, content_id, status, visibility, created_at, content:contents!inner(${contentFields})`, { count: 'exact' })
    .eq('celeb_id', params.userId)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })

  if (params.type) query = query.eq('content.type', params.type)
  if (searchIds) query = query.in('content_id', searchIds)
  if (params.hasReview === true) query = query.not('review', 'is', null).neq('review', '')
  if (params.hasReview === false) query = query.or('review.is.null,review.eq.')

  const { data, count, error } = await query.range(offset, offset + params.limit - 1)
  throwOnQueryError('celeb content index', error)
  const items = ((data ?? []) as unknown as Record<string, unknown>[])
    .map((row) => mapCelebIndexRow(row, locale))
    .filter((row): row is UserContentPublic => row !== null)
  const total = count ?? 0
  return {
    items,
    total,
    page: params.page,
    totalPages: Math.ceil(total / params.limit),
    hasMore: offset + items.length < total,
  }
}

export async function getPublicCelebContentIndex(
  input: CelebIndexParams,
): Promise<GetUserContentsResponse> {
  const locale = await getLocale()
  const params = { ...input, page: input.page ?? 1, limit: input.limit ?? 200 }
  const key = [params.userId, params.type, params.page, params.limit, params.search, params.hasReview]
    .map((value) => String(value ?? ''))
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    params.userId,
    ['celeb-content-expand-index-v2-affiliate', locale, ...key],
    () => fetchIndex(params, locale),
    { extraTags: [CACHE_TAGS.CONTENTS] },
  )
}

async function fetchRecord(celebId: string, contentId: string, locale: string) {
  const reviewEn = locale === 'en' ? 'review_en,' : ''
  const { data, error } = await createStaticClient()
    .from('celeb_contents')
    .select(`id, content_id, status, review, ${reviewEn} review_presets, is_spoiler, visibility, created_at, source_url, content:contents!inner(id, type, metadata, user_count:record_count, content_locales(${CL_SELECT_LIST_WITH_AFFILIATE}, isbn))`)
    .eq('celeb_id', celebId)
    .eq('content_id', contentId)
    .eq('visibility', 'public')
    .maybeSingle()
  throwOnQueryError('celeb content selected record', error)
  return data ? mapCelebRecordRow(data as unknown as Record<string, unknown>, locale) : null
}

export async function getPublicCelebContentRecord(
  celebId: string,
  contentId: string,
): Promise<UserContentPublic | null> {
  const locale = await getLocale()
  const key = ['celeb-content-expand-record-v2-affiliate', celebId, contentId, locale]
  return unstable_cache(() => fetchRecord(celebId, contentId, locale), key, {
    revalidate: spreadRevalidate(STATIC_REVALIDATE, key),
    tags: [...new Set([
      ...detailCacheTags(CACHE_TAGS.CELEBS, celebId),
      ...detailCacheTags(CACHE_TAGS.CONTENTS, contentId),
    ])],
  })()
}
