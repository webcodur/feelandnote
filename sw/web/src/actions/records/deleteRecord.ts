'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

export async function deleteRecord(recordId: string): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 먼저 content_id와 type 조회 (revalidate 및 로그용)
  const { data: record, error: fetchError } = await supabase
    .from('records')
    .select('content_id, type')
    .eq('id', recordId)
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    return handleSupabaseError(fetchError, { context: 'record', logPrefix: '[기록 조회]' })
  }

  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', recordId)
    .eq('user_id', user.id)

  if (error) {
    return handleSupabaseError(error, { context: 'record', logPrefix: '[기록 삭제]' })
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

  return success(null)
}
