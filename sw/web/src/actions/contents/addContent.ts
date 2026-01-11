'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'
import { addActivityScore, checkAchievements, type Title } from '@/actions/achievements'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface AddContentParams {
  id: string                    // 외부 API ID (ISBN, TMDB ID 등)
  type: ContentType
  title: string
  creator?: string
  thumbnailUrl?: string
  description?: string
  publisher?: string
  releaseDate?: string
  metadata?: Record<string, unknown>  // 원본 메타데이터
  subtype?: string              // video의 경우 movie | tv
  status?: ContentStatus        // 기본값: 'WANT'
  createdAt?: string            // 추가 날짜 (YYYY-MM-DD), 기본값: 오늘
  isRecommended?: boolean       // 추천 여부
}

interface AddContentData {
  contentId: string
  userContentId: string
  unlockedTitles: Title[]
}

export async function addContent(params: AddContentParams): Promise<ActionResult<AddContentData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 1. 콘텐츠 upsert (기존 콘텐츠도 metadata 업데이트)
  const { error: contentError } = await supabase
    .from('contents')
    .upsert(
      {
        id: params.id,
        type: params.type,
        subtype: params.subtype || null,
        title: params.title,
        creator: params.creator || null,
        thumbnail_url: params.thumbnailUrl || null,
        description: params.description || null,
        publisher: params.publisher || null,
        release_date: params.releaseDate || null,
        metadata: params.metadata || null,
      },
      {
        onConflict: 'id',
        ignoreDuplicates: false
      }
    )

  if (contentError) {
    return handleSupabaseError(contentError, { context: 'content', logPrefix: '[콘텐츠 생성]' })
  }

  // 2. user_contents 생성 (status 기본값: WANT)
  const insertData: {
    user_id: string
    content_id: string
    status: ContentStatus
    created_at?: string
    is_recommended?: boolean
  } = {
    user_id: user.id,
    content_id: params.id,
    status: (params.status ?? 'WANT') as ContentStatus,
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
    return handleSupabaseError(userContentError, { context: 'content', logPrefix: '[사용자 콘텐츠 생성]' })
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

  return success({
    contentId: params.id,
    userContentId: userContent.id,
    unlockedTitles: achievementResult.unlocked
  })
}
