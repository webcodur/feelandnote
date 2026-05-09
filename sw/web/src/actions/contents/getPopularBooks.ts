'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { getLocale } from 'next-intl/server'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import type { AffiliateLink } from '@/constants/affiliatePlatforms'

export interface PopularBook {
  id: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  affiliateLinks: AffiliateLink[]
}

async function fetchPopularBooks(limit: number, locale: string): Promise<PopularBook[]> {
  const supabase = createStaticClient()

  const { data: affiliateRows } = await supabase
    .from('content_locales')
    .select('content_id')
    .not('affiliate_url', 'is', null)

  if (!affiliateRows?.length) return []

  const contentIds = [...new Set(affiliateRows.map(r => r.content_id))]

  const { data, error } = await supabase
    .from('contents')
    .select(`id, user_count, content_locales(${CL_SELECT})`)
    .eq('type', 'BOOK')
    .in('id', contentIds)
    .order('user_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('제휴 도서 조회 실패:', error)
    return []
  }

  return (data || [])
    .map(item => {
      const locales = (item as Record<string, unknown>).content_locales as ContentLocaleRow[] | null
      const flat = flattenLocales(locales, locale)
      const affiliateLinks = (flat.affiliate_url as AffiliateLink[] | null) ?? []
      return {
        id: item.id,
        title: flat.title,
        creator: flat.creator,
        thumbnailUrl: flat.thumbnail_url,
        affiliateLinks,
      }
    })
    .filter(book => book.affiliateLinks.length > 0)
}

const getPopularBooksCached = unstable_cache(
  fetchPopularBooks,
  ['popular-books'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getPopularBooks(limit: number = 5): Promise<PopularBook[]> {
  const locale = await getLocale()
  return getPopularBooksCached(limit, locale)
}
