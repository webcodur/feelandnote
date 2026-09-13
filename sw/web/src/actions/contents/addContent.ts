'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import { resolveBookLocale, sourceToLocale, sourceToJsonb } from '@/lib/utils/content-locale'
import { normalizeBookIsbn } from '@/lib/utils/book-description'
import { getVideoEnLocale } from '@feelandnote/content-search/tmdb'
import { withoutBookDescription } from '@feelandnote/shared/lib/book-metadata'
import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'

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

/** 제목 정규화 — 부제·괄호·관사·문장부호를 걷어 같은 책인지 비교한다(기관 선정 등록 도구와 같은 기준). */
function normalizeWorkTitle(s: string): string {
  return s.normalize('NFKC').toLowerCase()
    .replace(/\([^)]*\)/g, ' ').split(/[:：]/)[0]
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

/**
 * 같은 locale 에서 제목(정규화)과 저자 성이 맞는 기존 작품을 찾는다.
 * displayRow: 그 locale 행이 표시용 제목 행(sources.primary='none')이라 실판본으로 덮어야 한다.
 */
async function findSameBookWork(
  db: Awaited<ReturnType<typeof createClient>>,
  locale: string,
  title: string,
  creator: string | null,
): Promise<{ contentId: string; displayRow: boolean; hasLocaleRow: boolean } | null> {
  const head = title.split(/[:：(]/)[0].trim()
  if (!head) return null
  const { data } = await db.from('content_locales').select('content_id,title,creator,sources').eq('locale', locale).ilike('title', head).limit(10)
  const want = normalizeWorkTitle(title)
  const surname = (creator ?? '').split(/[,/^]/)[0].trim().split(/\s+/).pop()?.toLowerCase() ?? ''
  for (const row of data ?? []) {
    if (normalizeWorkTitle(row.title ?? '') !== want) continue
    if (surname && row.creator && !row.creator.toLowerCase().includes(surname)) continue
    const primary = (row.sources as { primary?: string } | null)?.primary
    return { contentId: row.content_id, displayRow: primary === 'none', hasLocaleRow: true }
  }
  return null
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

  // 언어 행은 새 작품·기존 작품 재사용 양쪽에서 쓰므로 먼저 만든다
  const locale = params.type === 'BOOK' ? resolveBookLocale(params.externalSource, params.title) : sourceToLocale(params.externalSource)
  const bookIsbn = params.type === 'BOOK'
    ? normalizeBookIsbn(typeof params.metadata?.isbn === 'string' ? params.metadata.isbn : params.id)
    : null
  const introduction = params.type === 'BOOK'
    ? await fetchBookIntroduction({ isbn: bookIsbn, locale: locale === 'en' ? 'en' : 'ko' }).catch(() => null)
    : null
  const bookDescription = params.type === 'BOOK'
    ? introduction?.source ?? (params.description?.trim() || null)
    : params.description || null
  const localeRow = {
    locale,
    title: params.title,
    creator: params.creator || null,
    thumbnail_url: params.thumbnailUrl || null,
    description: bookDescription,
    ...(bookIsbn && { isbn: bookIsbn }),
    publisher: params.publisher || null,
    sources: { ...sourceToJsonb(params.externalSource), ...(introduction?.source && { description: introduction.sourceUrl }) },
    verified: true,
  }

  // ISBN 이 달라도 같은 책(제목 정규화 일치 + 저자 성 일치)이 이미 있으면 새로 만들지 않는다.
  // 판본 없이 표시용 제목 행만 든 작품이 있어(celeb-02-02) ISBN 대조만으로는 같은 책이 두 벌 생긴다. 표시행이면 이 실판본으로 덮는다.
  const sameWork = !existingContent && params.type === 'BOOK'
    ? await findSameBookWork(db, locale, params.title, params.creator ?? null)
    : null

  if (existingContent) {
    contentId = existingContent.id
  } else if (sameWork) {
    contentId = sameWork.contentId
    if (sameWork.displayRow) {
      await db.from('content_locales').update(localeRow).eq('content_id', contentId).eq('locale', locale)
    } else if (!sameWork.hasLocaleRow) {
      await db.from('content_locales').insert({ content_id: contentId, ...localeRow })
    }
  } else {
    // 새 콘텐츠 생성 (id 자동 생성)
    const { data: newContent, error: contentError } = await db
      .from('contents')
      .insert({
        type: params.type,
        subtype: params.subtype || null,
        release_date: params.releaseDate || null,
        metadata: params.metadata
          ? (params.type === 'BOOK' ? withoutBookDescription(params.metadata) : params.metadata)
          : null,
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
    await db.from('content_locales').insert({ content_id: contentId, ...localeRow })

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
