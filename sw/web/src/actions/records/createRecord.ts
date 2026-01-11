'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addActivityScore, checkAchievements, type Title } from '@/actions/achievements'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

export type RecordType = 'NOTE' | 'QUOTE' | 'CREATION'

interface CreateRecordParams {
  contentId: string
  type: RecordType
  content: string
  location?: string
}

interface CreateRecordData {
  id: string
  user_id: string
  content_id: string
  type: RecordType
  content: string
  location: string | null
  created_at: string
  unlockedTitles: Title[]
}

export async function createRecord(params: CreateRecordParams): Promise<ActionResult<CreateRecordData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 콘텐츠가 기록관에 있는지 확인
  const { data: userContent } = await supabase
    .from('user_contents')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_id', params.contentId)
    .single()

  if (!userContent) {
    return failure('NOT_IN_ARCHIVE')
  }

  const { data, error } = await supabase
    .from('records')
    .insert({
      user_id: user.id,
      content_id: params.contentId,
      type: params.type,
      content: params.content,
      location: params.location
    })
    .select()
    .single()

  if (error) {
    return handleSupabaseError(error, { context: 'record', logPrefix: '[기록 생성]' })
  }

  revalidatePath(`/archive/${params.contentId}`)
  revalidatePath('/archive')
  revalidatePath('/achievements')

  // 활동 로그
  await logActivity({
    actionType: 'RECORD_CREATE',
    targetType: 'record',
    targetId: data.id,
    contentId: params.contentId,
    metadata: { type: params.type, preview: params.content.slice(0, 50) }
  })

  // 업적 시스템: 점수 추가 및 칭호 체크
  const actionText = params.type === 'NOTE' ? 'Note 작성' : 'Quote 작성'
  await addActivityScore(actionText, 2, data.id)
  const achievementResult = await checkAchievements()

  return success({
    ...data,
    unlockedTitles: achievementResult.unlocked
  })
}
