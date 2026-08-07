'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'

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

  throwOnQueryError('getSharedContents', error)

  return (data ?? []) as SharedContent[]
}

const getCachedSharedContents = unstable_cache(
  fetchSharedContents,
  ['shared-contents'],
  // get_shared_contents_by_celebs: 셀럽(profiles) 간 공유 콘텐츠(user_contents·contents)
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getSharedContents(
  celebIds: string[],
  contentType?: string,
  limit = 10
): Promise<SharedContent[]> {
  if (celebIds.length < 2) return []
  return withQueryFallback(
    'getSharedContents',
    () => getCachedSharedContents(celebIds.join(','), contentType ?? '', limit),
    [],
  )
}
