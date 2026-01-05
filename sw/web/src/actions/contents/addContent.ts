'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'
import { addActivityScore, checkAchievements } from '@/actions/achievements'
import { logActivity } from '@/actions/activity'

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
  status?: ContentStatus        // 기본값: 'WANT'
  progress?: number             // 기본값: 0 (0-100)
  createdAt?: string            // 추가 날짜 (YYYY-MM-DD), 기본값: 오늘
  isRecommended?: boolean       // 추천 여부 (100% 완료 시)
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
  const progress = Math.max(0, Math.min(100, params.progress ?? 0))
  const insertData: {
    user_id: string
    content_id: string
    status: ContentStatus
    progress: number
    created_at?: string
    is_recommended?: boolean
  } = {
    user_id: user.id,
    content_id: params.id,
    status: (params.status ?? 'WANT') as ContentStatus,
    progress
  }

  // 날짜가 지정된 경우 created_at 설정
  if (params.createdAt) {
    insertData.created_at = new Date(params.createdAt).toISOString()
  }

  // 추천 여부 설정
  if (params.isRecommended !== undefined) {
    insertData.is_recommended = params.isRecommended
  }

  const { data: userContent, error: userContentError } = await supabase
    .from('user_contents')
    .insert(insertData)
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
  revalidatePath('/achievements')

  // 활동 로그
  await logActivity({
    actionType: 'CONTENT_ADD',
    targetType: 'content',
    targetId: userContent.id,
    contentId: params.id
  })

  // 업적 시스템: 점수 추가 및 칭호 체크
  await addActivityScore(`콘텐츠 추가 (${params.title})`, 1, userContent.id)
  const achievementResult = await checkAchievements()

  return {
    contentId: params.id,
    userContentId: userContent.id,
    unlockedTitles: achievementResult.unlocked
  }
}
