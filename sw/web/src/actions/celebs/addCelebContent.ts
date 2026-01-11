'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface AddCelebContentParams {
  celebId: string
  contentId: string
  type: ContentType
  title: string
  creator?: string
  thumbnailUrl?: string
  description?: string
  publisher?: string
  releaseDate?: string
  metadata?: Record<string, unknown>
  status?: ContentStatus
  sourceUrl: string  // 셀럽 기록은 출처 필수
}

interface AddCelebContentData {
  contentId: string
  userContentId: string
}

export async function addCelebContent(params: AddCelebContentParams): Promise<ActionResult<AddCelebContentData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 셀럽 프로필 확인
  const { data: celeb } = await supabase
    .from('profiles')
    .select('id, profile_type')
    .eq('id', params.celebId)
    .eq('profile_type', 'CELEB')
    .single()

  if (!celeb) {
    return failure('NOT_FOUND', '셀럽 프로필을 찾을 수 없다.')
  }

  // 출처 URL 검증
  if (!params.sourceUrl?.trim()) {
    return failure('VALIDATION_ERROR', '출처 링크는 필수다.')
  }

  // 1. 콘텐츠 upsert
  const { error: contentError } = await supabase
    .from('contents')
    .upsert(
      {
        id: params.contentId,
        type: params.type,
        title: params.title,
        creator: params.creator ?? null,
        thumbnail_url: params.thumbnailUrl ?? null,
        description: params.description ?? null,
        publisher: params.publisher ?? null,
        release_date: params.releaseDate ?? null,
        metadata: params.metadata ?? {}
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  if (contentError) {
    return handleSupabaseError(contentError, { context: 'content', logPrefix: '[셀럽 콘텐츠 생성]' })
  }

  // 2. user_contents 생성 (셀럽 프로필에 연결, contributor로 현재 사용자 기록)
  const { data: userContent, error: userContentError } = await supabase
    .from('user_contents')
    .insert({
      user_id: params.celebId,
      content_id: params.contentId,
      status: params.status ?? 'FINISHED',
      contributor_id: user.id
    })
    .select('id')
    .single()

  if (userContentError) {
    return handleSupabaseError(userContentError, { context: 'content', logPrefix: '[셀럽 사용자 콘텐츠 생성]' })
  }

  revalidatePath(`/u/${params.celebId}/archive`)

  return success({
    contentId: params.contentId,
    userContentId: userContent.id
  })
}
