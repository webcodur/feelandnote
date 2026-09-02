'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import { sourceToLocale, sourceToJsonb } from '@/lib/utils/content-locale'
import { getVideoEnLocale } from '@feelandnote/content-search/tmdb'

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
  externalSource?: string       // 외부 API 출처 (kakao_book, tmdb 등)
  /** @deprecated status는 더 이상 사용하지 않음. 리뷰 유무로 감상 여부 판단. */
  status?: ContentStatus
  createdAt?: string            // 추가 날짜 (YYYY-MM-DD), 기본값: 오늘
  isRecommended?: boolean       // 추천 여부
}

interface AddContentData {
  contentId: string
  userContentId: string
  /** 이미 기록해 둔 작품일 때만 채워진다. 새로 담은 작품에는 없다 */
  existingRecord?: {
    rating: number
    review: string
    reviewPresets: string[]
  }
}

export async function addContent(params: AddContentParams): Promise<ActionResult<AddContentData>> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 1. external_id로 기존 콘텐츠 확인
  const { data: existingContent } = await db
    .from('contents')
    .select('id')
    .eq('external_id', params.id)
    .maybeSingle()

  let contentId: string

  if (existingContent) {
    contentId = existingContent.id
  } else {
    // 새 콘텐츠 생성 (id 자동 생성)
    const { data: newContent, error: contentError } = await db
      .from('contents')
      .insert({
        type: params.type,
        subtype: params.subtype || null,
        release_date: params.releaseDate || null,
        metadata: params.metadata || null,
        external_id: params.id,
        external_source: params.externalSource || null,
      })
      .select('id')
      .single()

    if (contentError || !newContent) {
      return handleDatabaseError(contentError!, { context: 'content', logPrefix: '[콘텐츠 생성]' })
    }
    contentId = newContent.id

    // content_locales에 로케일 데이터 저장
    const locale = sourceToLocale(params.externalSource)
    await db.from('content_locales').insert({
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

    // VIDEO: en 행 자동 생성 (TMDB en-US + /images API)
    if (params.type === 'VIDEO' && locale === 'ko' && params.id) {
      getVideoEnLocale(params.id).then(async (en) => {
        if (!en) return
        await db.from('content_locales').insert({
          content_id: contentId,
          locale: 'en',
          title: en.title,
          creator: en.creator,
          thumbnail_url: en.thumbnailUrl,
          sources: en.thumbnailUrl
            ? { primary: 'tmdb', thumbnail: 'tmdb_en' }
            : { primary: 'tmdb', thumbnail: 'confirmed_unavailable' },
          verified: true,
        }).then(({ error: enErr }) => {
          if (enErr) console.error('[VIDEO en locale]', enErr.message)
        })
      }).catch(() => {})  // 실패해도 ko 등록에 영향 없음
    }
  }

  // 2. 회원 감상 기록 생성 (status 기본값: WANT)
  const insertData: {
    member_id: string
    content_id: string
    status: ContentStatus
    created_at?: string
    is_recommended?: boolean
  } = {
    member_id: user.id,
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

  const { data: userContent, error: userContentError } = await db
    .from('member_contents')
    .insert(insertData)
    .select('id')
    .single()

  if (userContentError) {
    // 중복 에러(23505)인 경우 기존 레코드 조회
    if (userContentError.code === '23505') {
      // 이미 기록해 둔 작품이다. 별점·감상·프리셋까지 함께 돌려줘야 편집기가 빈 칸으로 열리지 않는다
      const { data: existing, error: fetchError } = await db
        .from('member_contents')
        .select('id, rating, review, review_presets')
        .eq('member_id', user.id)
        .eq('content_id', contentId)
        .single()

      if (fetchError || !existing) {
        return handleDatabaseError(userContentError, { context: 'content', logPrefix: '[사용자 콘텐츠 생성]' })
      }

      // 기존 레코드 반환
      return success({
        contentId,
        userContentId: existing.id,
        existingRecord: {
          rating: existing.rating ?? 0,
          review: existing.review ?? '',
          reviewPresets: existing.review_presets ?? [],
        },
      })
    }

    return handleDatabaseError(userContentError, { context: 'content', logPrefix: '[사용자 콘텐츠 생성]' })
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

  return success({
    contentId,
    userContentId: userContent.id,
  })
}
