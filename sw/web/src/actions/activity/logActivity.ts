'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActivityActionType, ActivityTargetType } from '@/types/database'

interface LogActivityParams {
  actionType: ActivityActionType
  targetType: ActivityTargetType
  targetId: string
  contentId?: string
  metadata?: Record<string, unknown>
}

// 활동 로그 기록 (에러 발생해도 throw하지 않음)
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action_type: params.actionType,
      target_type: params.targetType,
      target_id: params.targetId,
      content_id: params.contentId ?? null,
      metadata: params.metadata ?? null
    })
  } catch {
    // 로깅 실패해도 메인 로직에 영향 주지 않음
    console.error('[logActivity] Failed to log activity')
  }
}
