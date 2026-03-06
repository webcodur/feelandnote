'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'
import { addActivityScore } from '@/actions/achievements'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import { sourceToLocale, sourceToJsonb } from '@/lib/utils/content-locale'

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
  externalSource?: string       // 외부 API 출처 (naver_book, tmdb 등)
  /** @deprecated status는 더 이상 사용하지 않음. 리뷰 유무로 감상 여부 판단. */
  status?: ContentStatus
  createdAt?: string            // 추가 날짜 (YYYY-MM-DD), 기본값: 오늘
  isRecommended?: boolean       // 추천 여부
}

interface AddContentData {
  contentId: string
  userContentId: string
}

export async function addContent(params: AddContentParams): Promise<ActionResult<AddContentData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 1. external_id로 기존 콘텐츠 확인
  const { data: existingContent } = await supabase
    .from('contents')
    .select('id')
    .eq('external_id', params.id)
    .maybeSingle()

  let contentId: string

  if (existingContent) {
    contentId = existingContent.id
  } else {
    // 새 콘텐츠 생성 (id 자동 생성)
    const { data: newContent, error: contentError } = await supabase
      .from('contents')
      .insert({
        type: params.type,
        subtype: params.subtype || null,
        title: params.title,
        creator: params.creator || null,
        thumbnail_url: params.thumbnailUrl || null,
        description: params.description || null,
        publisher: params.publisher || null,
        release_date: params.releaseDate || null,
        metadata: params.metadata || null,
        external_id: params.id,
        external_source: params.externalSource || null,
      })
      .select('id')
      .single()

    if (contentError || !newContent) {
      return handleSupabaseError(contentError!, { context: 'content', logPrefix: '[콘텐츠 생성]' })
    }
    contentId = newContent.id

    // content_locales 듀얼 라이트
    const locale = sourceToLocale(params.externalSource)
    await supabase.from('content_locales').insert({
      content_id: contentId,
      locale,
      title: params.title,
      creator: params.creator || null,
      thumbnail_url: params.thumbnailUrl || null,
      description: params.description || null,
      publisher: params.publisher || null,
      sources: sourceToJsonb(params.externalSource),
      verified: true,
    })
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
    content_id: contentId,
    // status는 deprecated - 레거시 호환을 위해 FINISHED로 고정
    status: 'FINISHED' as ContentStatus,
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
    // 중복 에러(23505)인 경우 기존 레코드 조회
    if (userContentError.code === '23505') {
      const { data: existing, error: fetchError } = await supabase
        .from('user_contents')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .single()

      if (fetchError || !existing) {
        return handleSupabaseError(userContentError, { context: 'content', logPrefix: '[사용자 콘텐츠 생성]' })
      }

      // 기존 레코드 반환
      return success({
        contentId,
        userContentId: existing.id,
      })
    }

    return handleSupabaseError(userContentError, { context: 'content', logPrefix: '[사용자 콘텐츠 생성]' })
  }

  revalidatePath(`/${user.id}/reading`)
  revalidatePath('/achievements')

  // 활동 로그
  await logActivity({
    actionType: 'CONTENT_ADD',
    targetType: 'content',
    targetId: userContent.id,
    contentId,
  })

  // 점수 추가
  await addActivityScore(`콘텐츠 추가 (${params.title})`, 1, userContent.id)

  return success({
    contentId,
    userContentId: userContent.id,
  })
}
