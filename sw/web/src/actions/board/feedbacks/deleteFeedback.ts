'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

export async function deleteFeedback(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 본인 글이고 PENDING 상태인지 확인
  const { data: existing } = await supabase
    .from('feedbacks')
    .select('author_id, status')
    .eq('id', id)
    .single()

  if (!existing) {
    return failure('NOT_FOUND', '피드백을 찾을 수 없다.')
  }

  if (existing.author_id !== user.id) {
    return failure('FORBIDDEN', '본인 글만 삭제할 수 있다.')
  }

  if (existing.status !== 'PENDING') {
    return failure('FORBIDDEN', '처리 중인 피드백은 삭제할 수 없다.')
  }

  const { error } = await supabase
    .from('feedbacks')
    .delete()
    .eq('id', id)

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[피드백 삭제]' })
  }

  revalidatePath('/board/feedback')

  return success(null)
}
