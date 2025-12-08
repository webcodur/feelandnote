'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'

export type { ContentType, ContentStatus }

interface AddContentParams {
  id: string                    // 외부 API ID (ISBN, TMDB ID 등)
  type: ContentType
  title: string
  creator?: string
  thumbnailUrl?: string
  description?: string
  publisher?: string
  releaseDate?: string
  metadata?: Record<string, unknown>
  status?: ContentStatus        // 기본값: 'WISH' (진행도 0%로 시작)
}

export async function addContent(params: AddContentParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 1. 콘텐츠 upsert (이미 존재하면 무시)
  const { error: contentError } = await supabase
    .from('contents')
    .upsert(
      {
        id: params.id,
        type: params.type,
        title: params.title,
        creator: params.creator || null,
        thumbnail_url: params.thumbnailUrl || null,
        description: params.description || null,
        publisher: params.publisher || null,
        release_date: params.releaseDate || null,
        metadata: params.metadata || {}
      },
      {
        onConflict: 'id',
        ignoreDuplicates: true
      }
    )

  if (contentError) {
    console.error('콘텐츠 생성 에러:', contentError)
    throw new Error('콘텐츠 추가에 실패했습니다')
  }

  // 2. user_contents 생성 (status 기본값: WISH, progress 기본값: 0)
  const { data: userContent, error: userContentError } = await supabase
    .from('user_contents')
    .insert({
      user_id: user.id,
      content_id: params.id,
      status: params.status || 'WISH',
      progress: 0
    })
    .select('id')
    .single()

  if (userContentError) {
    if (userContentError.code === '23505') {
      throw new Error('이미 추가된 콘텐츠입니다')
    }
    console.error('사용자 콘텐츠 생성 에러:', userContentError)
    throw new Error('콘텐츠 추가에 실패했습니다')
  }

  revalidatePath('/archive')

  return {
    contentId: params.id,
    userContentId: userContent.id
  }
}
