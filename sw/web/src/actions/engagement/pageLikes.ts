'use server'

import { createAdminClient } from '@/lib/db/admin'
import { getEngagementVisitor } from '@/lib/engagement-visitor'
import { isEngagementTarget, LIKE_COOLDOWN_MS, type EngagementKind, type PageLikes } from '@/lib/page-engagement'

interface LikesRow {
  like_count: number
  next_like_at: string | null
  accepted: boolean
}

async function requestLikes(kind: EngagementKind, targetId: string, like: boolean): Promise<PageLikes | null> {
  if (!isEngagementTarget(kind, targetId)) return null
  try {
    const visitor = await getEngagementVisitor()
    const { data, error } = await createAdminClient().rpc('page_likes', {
      p_kind: kind, p_target_id: targetId, p_visitor_hash: visitor,
      p_like: like, p_cooldown_seconds: LIKE_COOLDOWN_MS / 1000,
    }).returns<LikesRow[]>()
    if (error) throw new Error(error.message)
    const row = data?.[0]
    return row ? { count: Number(row.like_count), nextLikeAt: row.next_like_at, accepted: row.accepted } : null
  } catch (error) {
    console.error('[페이지 좋아요] 실패:', error instanceof Error ? error.message : 'unknown')
    return null
  }
}

export async function getPageLikes(kind: EngagementKind, targetId: string): Promise<PageLikes | null> {
  return requestLikes(kind, targetId, false)
}

export async function likePage(kind: EngagementKind, targetId: string): Promise<PageLikes | null> {
  return requestLikes(kind, targetId, true)
}
