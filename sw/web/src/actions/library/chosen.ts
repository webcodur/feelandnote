'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getLocale } from 'next-intl/server'
import type { LibraryContent, LibraryResult } from './types'

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

  // 진짜로 결과가 없는 경우다. 이건 캐시해도 된다.
  if (!data?.length) {
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const total = Number((data as Record<string, unknown>[])[0]?.total_count ?? 0)
  const contents: LibraryContent[] = (data as Record<string, unknown>[]).map(row => {
    const titleKo = (row.title_ko as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    const creatorKo = (row.creator as string) ?? null
    const creatorEn = (row.creator_en as string) ?? null
    const thumbKo = (row.thumbnail_url as string) ?? null
    const thumbEn = (row.thumbnail_en as string) ?? null
    return {
      id: row.content_id as string,
      title: (locale === 'en' ? titleEn || titleKo : titleKo || titleEn) || '',
      creator: (locale === 'en' ? creatorEn || creatorKo : creatorKo || creatorEn) ?? null,
      thumbnail_url: (locale === 'en' ? thumbEn || thumbKo : thumbKo || thumbEn) ?? null,
      type: row.content_type as string,
      celeb_count: Number(row.celeb_count),
      user_count: Number(row.user_count),
      avg_rating: row.avg_rating ? Number(row.avg_rating) : null,
      title_ko: titleKo,
      title_en: titleEn,
      creator_en: creatorEn,
      isbn_en: (row.isbn_en as string) ?? null,
      thumbnail_en: thumbEn,
      has_en_edition: (row.has_en_edition as boolean) ?? null,
    }
  })

  return {
    contents,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

const getChosenLibraryCached = unstable_cache(
  fetchChosenLibrary,
  ['chosen-library'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getChosenLibrary(params?: {
  category?: string
  page?: number
  limit?: number
}): Promise<LibraryResult> {
  const locale = await getLocale()
  const page = params?.page || 1
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
