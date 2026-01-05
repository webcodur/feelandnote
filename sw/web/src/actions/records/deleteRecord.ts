'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'

export async function deleteRecord(recordId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 먼저 content_id와 type 조회 (revalidate 및 로그용)
  const { data: record, error: fetchError } = await supabase
    .from('records')
    .select('content_id, type')
    .eq('id', recordId)
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error('기록을 찾을 수 없습니다')
    }
    console.error('Fetch record error:', fetchError)
    throw new Error('기록 조회에 실패했습니다')
  }

  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', recordId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Delete record error:', error)
    throw new Error('기록 삭제에 실패했습니다')
  }

  revalidatePath(`/archive/${record.content_id}`)
  revalidatePath('/archive')

  // 활동 로그
  await logActivity({
    actionType: 'RECORD_DELETE',
    targetType: 'record',
    targetId: recordId,
    contentId: record.content_id,
    metadata: { type: record.type }
  })

  return { success: true }
}
