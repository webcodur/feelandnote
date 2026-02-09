'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType } from '@/types/database'

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
    .select('id, type, title, creator, thumbnail_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('최신 콘텐츠 조회 실패:', error)
    return []
  }

  return data as RecentContent[]
}
