import type { DatabaseClient } from '@feelandnote/db'
import type { ActivityActionType, ActivityTargetType } from '@/types/database'

export interface ActivityLogInput {
  actionType: ActivityActionType
  targetType: ActivityTargetType
  targetId: string
  contentId?: string
  metadata?: Record<string, unknown>
}

/** 외부 ID는 현재 작품 한 건에 정확히 대응할 때만 작품 참조로 기록한다. */
export async function writeActivityLog(db: DatabaseClient, userId: string, input: ActivityLogInput): Promise<void> {
  const rawId = input.contentId
  let contentId: string | null = null
  if (rawId) {
    const direct = await db.from('contents').select('id').eq('id', rawId).maybeSingle()
    if (direct.error) throw direct.error
    if (direct.data) contentId = direct.data.id
    else {
      const alias = await db.from('contents').select('id').eq('external_id', rawId).limit(2)
      if (alias.error) throw alias.error
      if (alias.data?.length === 1) contentId = alias.data[0].id
    }
  }
  // 작품이 나중에 삭제되어 FK가 NULL이 되어도 당시 입력 참조는 남긴다.
  const metadata = rawId
    ? { ...input.metadata, historicalContentId: input.metadata?.historicalContentId ?? rawId }
    : input.metadata ?? null
  const row = {
    user_id: userId,
    action_type: input.actionType,
    target_type: input.targetType,
    target_id: input.targetId,
    content_id: contentId,
    metadata,
  }
  const result = await db.from('activity_logs').insert(row)
  // 조회와 삽입 사이에 작품이 삭제됐으면 검증된 FK 오류에 한해서 역사 로그로 남긴다.
  if (result.error?.code === '23503' && result.error.message?.includes('activity_logs_content_id_fkey')) {
    const retry = await db.from('activity_logs').insert({ ...row, content_id: null })
    if (retry.error) throw retry.error
    return
  }
  if (result.error) throw result.error
}

/** 삭제된 작품의 로그는 보존하지만, 현재 작품을 찾을 수 없는 책 카드는 만들지 않는다. */
export function filterActivityBatch<T extends { content_id: string | null }>(
  activities: T[], contents: { id: string; type: string }[], contentType: string | null,
): T[] {
  const matching = new Set(contents.filter(content => !contentType || content.type === contentType).map(content => content.id))
  return activities.filter(activity => activity.content_id !== null && matching.has(activity.content_id))
}
