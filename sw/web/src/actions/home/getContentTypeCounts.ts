'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE } from '@/lib/cache'

export type ContentTypeCounts = Record<string, number>

const DEFAULT_COUNTS: ContentTypeCounts = {
  all: 0,
  BOOK: 0,
  VIDEO: 0,
  GAME: 0,
  MUSIC: 0,
  CERTIFICATE: 0,
}

async function fetchContentTypeCounts(): Promise<ContentTypeCounts> {
  const supabase = createStaticClient()

  // DB 함수로 한 번에 카운트 조회
  const { data, error } = await supabase.rpc('get_celeb_feed_type_counts')

  if (error || !data) {
    console.error('getContentTypeCounts error:', error)
    return DEFAULT_COUNTS
  }

  return data as ContentTypeCounts
}

export const getContentTypeCounts = unstable_cache(
  fetchContentTypeCounts,
  ['content-type-counts'],
  // get_celeb_feed_type_counts: 셀럽(profiles) 서고(user_contents)의 타입별 집계
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)
