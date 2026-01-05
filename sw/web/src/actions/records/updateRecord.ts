'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'

interface UpdateRecordParams {
  recordId: string
  content?: string
  rating?: number | null
  location?: string | null
}

export async function updateRecord(params: UpdateRecordParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // rating 검증
  if (params.rating !== undefined && params.rating !== null) {
    if (params.rating < 0.5 || params.rating > 5) {
      throw new Error('별점은 0.5~5 사이여야 합니다')
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
    if (error.code === 'PGRST116') {
      throw new Error('기록을 찾을 수 없습니다')
    }
    console.error('Update record error:', error)
    throw new Error('기록 수정에 실패했습니다')
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

  return data
}
