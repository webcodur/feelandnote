'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import type { ContentType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

export interface RecentContent {
  id: string
  type: ContentType
  title: string
  creator: string | null
  thumbnail_url: string | null
  created_at: string
}

async function fetchRecentContents(limit: number, locale: string): Promise<RecentContent[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('contents')
    .select(`id, type, created_at, content_locales(${CL_SELECT_LIST})`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('최신 콘텐츠 조회 실패:', error)
    return []
  }

  return (data || []).map(item => {
    const locales = (item as Record<string, unknown>).content_locales as ContentLocaleRow[] | null
    const flat = flattenLocales(locales, locale)
    return {
      id: item.id,
      type: item.type as ContentType,
      title: flat.title,
      creator: flat.creator,
      thumbnail_url: flat.thumbnail_url,
      created_at: item.created_at,
    }
  })
}

const getRecentContentsCached = unstable_cache(
  fetchRecentContents,
  ['recent-contents'],
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS] }
)

export async function getRecentContents(limit: number = 10): Promise<RecentContent[]> {
  const locale = await getLocale()
  return getRecentContentsCached(limit, locale)
}
