'use server'

import { createAdminClient } from '@/lib/db/admin'
import { FREE_POST_COLS } from '@/lib/board/freeBoard'
import { attachMemberAuthor } from '@/lib/board/memberProfiles'
import type { FreePost } from '@/types/database'
import type { Locale } from '@/types/locale'

// 상세 조회 (순수 조회 — 조회수는 건드리지 않음)
export async function getFreePost(id: string, locale: Locale): Promise<FreePost | null> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('free_posts')
    .select(FREE_POST_COLS)
    .eq('id', id)
    .eq('is_deleted', false)
    .eq('locale', locale)
    .single()

  if (error || !data) return null
  const post = await attachMemberAuthor(db, data)
  return post as unknown as FreePost
}

// 조회수 +1 (상세 페이지 렌더 시 1회 호출, best-effort)
export async function incrementFreePostView(id: string): Promise<void> {
  const db = createAdminClient()
  const { data } = await db
    .from('free_posts')
    .select('view_count')
    .eq('id', id)
    .single()
  if (data) {
    await db
      .from('free_posts')
      .update({ view_count: (data as { view_count: number }).view_count + 1 })
      .eq('id', id)
  }
}
