'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'

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

export async function addCelebContent(params: AddCelebContentParams) {
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
    console.error('콘텐츠 생성 에러:', contentError)
    throw new Error('콘텐츠 추가에 실패했습니다')
  }

  // 2. user_contents 생성 (셀럽 프로필에 연결, contributor로 현재 사용자 기록)
  const { data: userContent, error: userContentError } = await supabase
    .from('user_contents')
    .insert({
      user_id: params.celebId,
      content_id: params.contentId,
      status: params.status ?? 'EXPERIENCE',
      progress: 100,
      contributor_id: user.id
    })
    .select('id')
    .single()

  if (userContentError) {
    if (userContentError.code === '23505') {
      throw new Error('이미 추가된 콘텐츠입니다')
    }
    console.error('셀럽 콘텐츠 생성 에러:', userContentError)
    throw new Error('콘텐츠 추가에 실패했습니다')
  }

  revalidatePath(`/u/${params.celebId}/archive`)

  return {
    contentId: params.contentId,
    userContentId: userContent.id
  }
}
