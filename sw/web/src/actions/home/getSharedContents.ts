'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function getSharedContents(
  celebIds: string[],
  contentType?: string,
  limit = 10
): Promise<SharedContent[]> {
  if (celebIds.length < 2) return []

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_shared_contents_by_celebs', {
    p_celeb_ids: celebIds,
    p_content_type: contentType ?? null,
    p_limit: limit,
  })

  if (error) {
    console.error('getSharedContents error:', error.message)
    return []
  }

  return (data ?? []) as SharedContent[]
}
