'use server'

import { createClient } from '@/lib/supabase/server'
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

export async function getPopularBooks(limit: number = 5): Promise<PopularBook[]> {
  const supabase = await createClient()

  // 1. affiliate_url이 있는 도서 ID 조회
  const { data: affiliateRows } = await supabase
    .from('content_locales')
    .select('content_id')
    .not('affiliate_url', 'is', null)

  if (!affiliateRows?.length) return []

  const contentIds = [...new Set(affiliateRows.map(r => r.content_id))]

  // 2. 해당 도서의 전체 로케일 데이터 조회
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

  const locale = await getLocale()
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
