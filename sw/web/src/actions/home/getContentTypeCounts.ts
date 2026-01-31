'use server'

import { createClient } from '@/lib/supabase/server'

export type ContentTypeCounts = Record<string, number>

const DEFAULT_COUNTS: ContentTypeCounts = {
  all: 0,
  BOOK: 0,
  VIDEO: 0,
  GAME: 0,
  MUSIC: 0,
  CERTIFICATE: 0,
}

export async function getContentTypeCounts(): Promise<ContentTypeCounts> {
  const supabase = await createClient()

  // DB 함수로 한 번에 카운트 조회 (12회 쿼리 → 1회)
  const { data, error } = await supabase.rpc('get_celeb_feed_type_counts')

  if (error || !data) {
    console.error('getContentTypeCounts error:', error)
    return DEFAULT_COUNTS
  }

  return data as ContentTypeCounts
}
