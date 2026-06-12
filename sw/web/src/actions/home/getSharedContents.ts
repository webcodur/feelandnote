'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'

export interface SharedContent {
  content_id: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  content_type: string
  celeb_count: number
  avg_rating: number | null
  celeb_nicknames: string[]
}

// 캐시 inner: id 목록 문자열·콘텐츠 타입·개수만 받아 캐시 키를 안정화한다
async function fetchSharedContents(
  idsKey: string,
  contentType: string,
  limit: number
): Promise<SharedContent[]> {
  const supabase = createStaticClient()
  const { data, error } = await supabase.rpc('get_shared_contents_by_celebs', {
    p_celeb_ids: idsKey.split(','),
    p_content_type: contentType || null,
    p_limit: limit,
  })

  if (error) {
    console.error('getSharedContents error:', error.message)
    return []
  }

  return (data ?? []) as SharedContent[]
}

const getCachedSharedContents = unstable_cache(
  fetchSharedContents,
  ['shared-contents'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getSharedContents(
  celebIds: string[],
  contentType?: string,
  limit = 10
): Promise<SharedContent[]> {
  if (celebIds.length < 2) return []
  return getCachedSharedContents(celebIds.join(','), contentType ?? '', limit)
}
