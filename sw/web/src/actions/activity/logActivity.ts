'use server'

import { createClient } from '@/lib/db/server'
import { writeActivityLog, type ActivityLogInput } from '@/lib/activity-content-reference'

// 활동 로그 기록 (에러 발생해도 throw하지 않음)
export async function logActivity(params: ActivityLogInput): Promise<void> {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()

    if (!user) return

    await writeActivityLog(db, user.id, params)
  } catch {
    // 로깅 실패해도 메인 로직에 영향 주지 않음
    console.error('[logActivity] Failed to log activity')
  }
}
