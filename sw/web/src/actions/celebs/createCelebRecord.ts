'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RecordType } from '@/types/database'

interface CreateCelebRecordParams {
  celebId: string
  contentId: string
  type: RecordType
  content: string
  rating?: number
  sourceUrl: string  // 셀럽 기록은 출처 필수
}

export async function createCelebRecord(params: CreateCelebRecordParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 셀럽 프로필 확인
  const { data: celeb } = await supabase
    .from('profiles')
    .select('id, profile_type')
    .eq('id', params.celebId)
    .eq('profile_type', 'CELEB')
    .single()

  if (!celeb) {
    throw new Error('셀럽 프로필을 찾을 수 없습니다')
  }

  // 출처 URL 검증
  if (!params.sourceUrl?.trim()) {
    throw new Error('출처 링크는 필수입니다')
  }

  // 콘텐츠가 셀럽 기록관에 있는지 확인
  const { data: userContent } = await supabase
    .from('user_contents')
    .select('id')
    .eq('user_id', params.celebId)
    .eq('content_id', params.contentId)
    .single()

  if (!userContent) {
    throw new Error('셀럽 기록관에 추가된 콘텐츠만 기록할 수 있습니다')
  }

  // rating 검증 (REVIEW 타입일 때만)
  if (params.type === 'REVIEW' && params.rating !== undefined) {
    if (params.rating < 0.5 || params.rating > 5) {
      throw new Error('별점은 0.5~5 사이여야 합니다')
    }
  }

  const { data, error } = await supabase
    .from('records')
    .insert({
      user_id: params.celebId,
      content_id: params.contentId,
      type: params.type,
      content: params.content,
      rating: params.type === 'REVIEW' ? params.rating : null,
      contributor_id: user.id,
      source_url: params.sourceUrl
    })
    .select()
    .single()

  if (error) {
    console.error('Create celeb record error:', error)
    throw new Error('기록 생성에 실패했습니다')
  }

  revalidatePath(`/u/${params.celebId}/archive/${params.contentId}`)
  revalidatePath(`/u/${params.celebId}/archive`)

  return data
}
