'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { FREE_POST_COLS, FREE_AUTHOR_JOIN } from '@/lib/board/freeBoard'
import type { FreePost } from '@/types/database'

// 상세 조회 (순수 조회 — 조회수는 건드리지 않음)
export async function getFreePost(id: string): Promise<FreePost | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('free_posts')
    .select(`${FREE_POST_COLS}, ${FREE_AUTHOR_JOIN}`)
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (error || !data) return null
  return data as unknown as FreePost
}

// 조회수 +1 (상세 페이지 렌더 시 1회 호출, best-effort)
export async function incrementFreePostView(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('free_posts')
    .select('view_count')
    .eq('id', id)
    .single()
  if (data) {
    await supabase
      .from('free_posts')
      .update({ view_count: (data as { view_count: number }).view_count + 1 })
      .eq('id', id)
  }
}
