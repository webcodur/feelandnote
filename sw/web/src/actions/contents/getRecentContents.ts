'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType } from '@/types/database'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

export interface RecentContent {
  id: string
  type: ContentType
  title: string
  creator: string | null
  thumbnail_url: string | null
  created_at: string
}

export async function getRecentContents(limit: number = 10): Promise<RecentContent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contents')
    .select(`id, type, title, creator, thumbnail_url, created_at, content_locales(${CL_SELECT})`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('최신 콘텐츠 조회 실패:', error)
    return []
  }

  return (data || []).map(item => {
    const locales = (item as Record<string, unknown>).content_locales as ContentLocaleRow[] | null
    const flat = flattenLocales(locales)
    return {
      id: item.id,
      type: item.type as ContentType,
      title: flat.title || item.title,
      creator: flat.creator || item.creator,
      thumbnail_url: flat.thumbnail_url || item.thumbnail_url,
      created_at: item.created_at,
    }
  })
}
