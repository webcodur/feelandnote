'use server'

import { unstable_cache } from 'next/cache'
import { toScriptureResult } from '@/lib/library/scriptureResult'
import { CLASSICS_ERAS } from '@/lib/library/classicsQuery'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getLocale } from 'next-intl/server'
import type { LibraryResult } from './types'
import { attachBookAffiliateUrls } from './helpers'

async function fetchEraContents(
  era: string,
  category: string | null,
  page: number,
  limit: number,
  locale: string,
): Promise<LibraryResult> {
  const eraKey = era as typeof CLASSICS_ERAS[number]
  if (!CLASSICS_ERAS.includes(eraKey)) {
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const db = createStaticClient()
  const offset = (page - 1) * limit
  const { data, error } = await db.rpc('get_scriptures_by_era', {
    p_era: eraKey,
    p_category: category,
    p_limit: limit,
    p_offset: offset,
  })

  throwOnQueryError('get_scriptures_by_era', error)

  const result = toScriptureResult(data as Record<string, unknown>[] | null, locale, page, limit)

  // 카드 발꿈치의 구매 단추가 읽는다 — RPC 반환에 없는 제휴 링크를 이 페이지 도서만 따로 채운다
  await attachBookAffiliateUrls(db, result.contents, locale)
  return result
}

const getEraContentsCached = unstable_cache(
  fetchEraContents,
  ['era-contents-v3'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getEraContents(params: {
  era: string
  category?: string
  page?: number
  limit?: number
  throwOnError?: boolean
}): Promise<LibraryResult> {
  const locale = await getLocale()
  const page = params.page || 1
  if (params.throwOnError) return getEraContentsCached(params.era, params.category || null, page, params.limit || 12, locale)
  return withQueryFallback(
    'getEraContents',
    () => getEraContentsCached(params.era, params.category || null, page, params.limit || 12, locale),
    { contents: [], total: 0, totalPages: 0, currentPage: page },
  )
}
