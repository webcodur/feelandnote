'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'

interface UpdateProgressParams {
  userContentId: string
  progress: number
}

export async function updateProgress({ userContentId, progress }: UpdateProgressParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // progress는 0-100 사이 값
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))

  // 현재 상태/진행도 확인
  const { data: currentContent } = await supabase
    .from('user_contents')
    .select('status, progress, content_id')
    .eq('id', userContentId)
    .eq('user_id', user.id)
    .single()

  // 진행도에 따른 상태 자동 변경
  // - 100%면 COMPLETE + completed_at 설정
  // - 100% 미만이고 현재 COMPLETE면 EXPERIENCE로 변경 + completed_at 해제
  // - 0이 아니고 현재 WISH면 EXPERIENCE로 변경
  const updateData: { progress: number; status?: string; completed_at?: string | null } = { progress: clampedProgress }
  if (clampedProgress === 100) {
    updateData.status = 'COMPLETE'
    updateData.completed_at = new Date().toISOString()
  } else if (clampedProgress < 100 && currentContent?.status === 'COMPLETE') {
    updateData.status = 'EXPERIENCE'
    updateData.completed_at = null
  } else if (clampedProgress > 0 && currentContent?.status === 'WISH') {
    updateData.status = 'EXPERIENCE'
  }

  const { error } = await supabase
    .from('user_contents')
    .update(updateData)
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('진행도 변경 에러:', error)
    throw new Error('진행도 변경에 실패했습니다')
  }

  revalidatePath('/archive')

  // 활동 로그
  await logActivity({
    actionType: 'PROGRESS_CHANGE',
    targetType: 'content',
    targetId: userContentId,
    contentId: currentContent?.content_id,
    metadata: { from: currentContent?.progress ?? 0, to: clampedProgress }
  })

  return { success: true, progress: clampedProgress, status: updateData.status }
}
