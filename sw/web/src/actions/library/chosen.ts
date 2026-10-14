'use server'

import { unstable_cache } from 'next/cache'
import { toScriptureResult } from '@/lib/library/scriptureResult'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getLocale } from 'next-intl/server'
import type { LibraryContent, LibraryResult } from './types'
import { attachBookAffiliateUrls } from './helpers'

// #region 인물들의 선택 - 셀럽이 가장 많이 본 콘텐츠
async function fetchChosenLibrary(
  category: string | null,
  page: number,
  limit: number,
  locale: string,
): Promise<LibraryResult> {
  const db = createStaticClient()
  const offset = (page - 1) * limit

  const { data, error } = await db.rpc('get_chosen_scriptures', {
    p_category: category,
    p_limit: limit,
    p_offset: offset,
  })

  throwOnQueryError('get_chosen_scriptures', error)

  const result = toScriptureResult(data as Record<string, unknown>[] | null, locale, page, limit)

  // 카드 발꿈치의 구매 단추가 읽는다 — RPC 반환에 없는 제휴 링크를 이 페이지 도서만 따로 채운다
  await attachBookAffiliateUrls(db, result.contents, locale)
  return result
}

const getChosenLibraryCached = unstable_cache(
  fetchChosenLibrary,
  ['chosen-library-v3'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getChosenLibrary(params?: {
  category?: string
  page?: number
  limit?: number
  /** Interactive filters show RetryBlock rather than interpreting an upstream error as an empty list. */
  throwOnError?: boolean
}): Promise<LibraryResult> {
  const locale = await getLocale()
  const page = params?.page || 1
  if (params?.throwOnError) return getChosenLibraryCached(params.category || null, page, params.limit || 12, locale)
  return withQueryFallback(
    'getChosenLibrary',
    () => getChosenLibraryCached(params?.category || null, page, params?.limit || 12, locale),
    { contents: [], total: 0, totalPages: 0, currentPage: page },
  )
}

export async function getQuickRecordSuggestions(category: string = 'BOOK'): Promise<LibraryContent[]> {
  const result = await getChosenLibrary({ category, limit: 30 })
  const suggestions = result.contents.filter(item => !item.title.includes('성경'))
  return suggestions.slice(0, 10)
}
// #endregion
