'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface UpdateRecordParams {
  recordId: string
  content?: string
  rating?: number | null
  location?: string | null
}

interface UpdateRecordData {
  id: string
  user_id: string
  content_id: string
  type: string
  content: string
  location: string | null
  rating: number | null
  created_at: string
  updated_at: string
}

export async function updateRecord(params: UpdateRecordParams): Promise<ActionResult<UpdateRecordData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // rating 검증
  if (params.rating !== undefined && params.rating !== null) {
    if (params.rating < 0.5 || params.rating > 5) {
      return failure('VALIDATION_ERROR', '별점은 0.5~5 사이여야 한다.')
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (params.content !== undefined) {
    updateData.content = params.content
  }
  if (params.rating !== undefined) {
    updateData.rating = params.rating
  }
  if (params.location !== undefined) {
    updateData.location = params.location
  }

  const { data, error } = await supabase
    .from('records')
    .update(updateData)
    .eq('id', params.recordId)
    .eq('user_id', user.id)
    .select(`
      *,
      content:contents(id, title, type, thumbnail_url)
    `)
    .single()

  if (error) {
    return handleSupabaseError(error, { context: 'record', logPrefix: '[기록 수정]' })
  }

  revalidatePath(`/archive/${data.content_id}`)
  revalidatePath('/archive')

  // 활동 로그
  await logActivity({
    actionType: 'RECORD_UPDATE',
    targetType: 'record',
    targetId: params.recordId,
    contentId: data.content_id
  })

  return success(data as UpdateRecordData)
}
