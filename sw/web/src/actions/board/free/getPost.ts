'use server'

import { NO_ROWS_CODE, throwOnQueryError } from '@/lib/cache'
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

  // 그 밖의 오류는 던진다 — 장애를 「없는 글」로 위장해 404를 내지 않는다.
  throwOnQueryError('[자유게시판 상세]', error, { ignoreCodes: [NO_ROWS_CODE] })
  // 여기 오는 오류는 "글이 없다" 하나뿐이다.
  if (!data) return null
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
