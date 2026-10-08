'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, ContentStatus } from '@/types/database'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import { sourceToLocale, sourceToJsonb } from '@/lib/utils/content-locale'
import { getVideoEnLocale } from '@feelandnote/content-search/tmdb'
import { withoutBookDescription } from '@feelandnote/shared/lib/book-metadata'
import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'
import { resolveExternalBookInput, externalBookWorkKey } from '@feelandnote/content-search/external-book-input'
import { toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { registeredSeriesMatches } from '@feelandnote/content-search/book-series'
import { getEnglishBookMetadataCached } from '@/lib/books/bookSearch.server'

interface AddContentParams {
  id: string                    // 기존 contents.id 또는 외부 API ID (ISBN, TMDB ID 등)
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

  if (params.createdAt && !Number.isFinite(new Date(params.createdAt).getTime())) {
    return failure('VALIDATION_ERROR', '추가 날짜를 확인해주세요.')
  }

  // 등록 작품을 담는 호출은 DB ID를 보낸다. 이 경로에서는 카드나 판본을 다시 쓰지 않는다.
  const { data: byId, error: idError } = await db
    .from('contents')
    .select('id, type')
    .eq('id', params.id)
    .maybeSingle()
  if (idError) return handleDatabaseError(idError, { context: 'content', logPrefix: '[작품 ID 확인]' })
  if (byId && byId.type !== params.type) return failure('VALIDATION_ERROR', '선택한 작품의 종류가 다릅니다.')
  let existingContent = byId
  if (!existingContent) {
    const { data, error } = await db.from('contents').select('id, type').eq('external_id', params.id).eq('type', params.type).maybeSingle()
    if (error) {
      if (error.code === 'PGRST116') return failure('CONFLICT', '외부 ID가 여러 작품에 연결되어 있습니다. 작품을 다시 확인해주세요.')
      return handleDatabaseError(error, { context: 'content', logPrefix: '[외부 작품 확인]' })
    }
    existingContent = data
  }

  let contentId: string
  let book: Awaited<ReturnType<typeof resolveExternalBookInput>> | null = null
  if (!existingContent && params.type === 'BOOK') {
    const isbn = toIsbn13(typeof params.metadata?.isbn === 'string' ? params.metadata.isbn : params.id)
    const externalIsbn = toIsbn13(params.id)
    if (!isbn || (externalIsbn && externalIsbn !== isbn)) {
      return failure('VALIDATION_ERROR', '도서는 검색에서 확인한 판본 ISBN으로 추가해주세요. 상품 코드나 수동 제목만으로 실판본을 등록할 수 없습니다.')
    }
    // 같은 ISBN이 대표 카드가 아닌 별도 판본에 있어도 원래 작품을 재사용한다.
    const matches = await Promise.all([
      db.from('contents').select('id').eq('type', 'BOOK').eq('external_id', isbn),
      db.from('content_locales').select('content_id').eq('isbn', isbn),
      db.from('figure_book_editions').select('content_id').eq('isbn', isbn),
    ])
    for (const result of matches) if (result.error) return handleDatabaseError(result.error, { context: 'content', logPrefix: '[판본 작품 확인]' })
    const ids = [...new Set([
      ...(matches[0].data ?? []).map(row => row.id),
      ...(matches[1].data ?? []).map(row => row.content_id),
      ...(matches[2].data ?? []).map(row => row.content_id),
    ])]
    if (ids.length > 1) return failure('CONFLICT', '같은 ISBN이 여러 작품에 연결되어 있습니다. 작품을 다시 확인해주세요.')
    if (ids.length === 1) {
      const { data, error } = await db.from('contents').select('id, type').eq('id', ids[0]).maybeSingle()
      if (error) return handleDatabaseError(error, { context: 'content', logPrefix: '[판본 원작 확인]' })
      if (!data || data.type !== 'BOOK') return failure('CONFLICT', '판본에 연결된 작품을 확인할 수 없습니다.')
      existingContent = data
    } else {
      try {
        book = await resolveExternalBookInput({
          externalId: params.id, externalSource: params.externalSource ?? '',
          title: params.title, creator: params.creator ?? '', coverImageUrl: params.thumbnailUrl ?? null,
          metadata: params.metadata ?? {},
        }, { getEnglishBookMetadata: getEnglishBookMetadataCached })
      } catch (cause) {
        return failure('VALIDATION_ERROR', cause instanceof Error ? cause.message : '공식 공급처에서 도서 판본을 확인하지 못했습니다.')
      }
      const workKey = externalBookWorkKey(book)
      if (workKey) {
        const matches = await Promise.all([
          db.from('contents').select('id').eq('type', 'BOOK').eq('metadata->>workKey', workKey).limit(1),
          db.from('contents').select('id').eq('type', 'BOOK').eq('metadata->figureBook->>openLibraryWork', workKey).limit(1),
          db.from('figure_book_editions').select('content_id').eq('sources->>workKey', workKey).limit(1),
          db.from('content_locales').select('content_id').eq('sources->>workKey', workKey).limit(1),
        ])
        for (const match of matches) if (match.error) return handleDatabaseError(match.error, { context: 'content', logPrefix: '[도서 원작 판본 확인]' })
        if (matches.some(match => match.data?.length)) return failure('CONFLICT', '같은 원작에 연결된 판본이 있습니다. 기존 작품에서 본문 범위를 확인한 뒤 판본을 추가해주세요.')
      }
      const seriesWorks: { id: string; metadata: unknown }[] = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('contents').select('id, metadata').eq('type', 'BOOK')
          .not('metadata->figureBook->series', 'is', null).order('id').range(from, from + 999)
        if (error) return handleDatabaseError(error, { context: 'content', logPrefix: '[등록 시리즈 확인]' })
        seriesWorks.push(...(data ?? []))
        if ((data?.length ?? 0) < 1000) break
      }
      const series = registeredSeriesMatches(seriesWorks, [{ title: book.title, creator: book.creator, locale: book.locale }])
      if (series.length) return failure('CONFLICT', `《${series[0].title}》에 속한 책입니다. 등록된 시리즈 작품을 선택해주세요.`)
      // 제목·원저자가 같아도 ISBN이 다른 책의 원전·선집 범위가 같다는 근거는 아니다.
      const { data: candidates, error } = await db.from('content_locales').select('content_id, content:contents!inner(type)')
        .eq('content.type', 'BOOK').eq('locale', book.locale).eq('title', book.title).eq('creator', book.creator).limit(1)
      if (error) return handleDatabaseError(error, { context: 'content', logPrefix: '[도서 원전 확인]' })
      if (candidates?.length) return failure('CONFLICT', '같은 제목과 원저자의 다른 판본이 있습니다. 원전과 수록 범위를 확인한 뒤 추가해주세요.')
    }
  }

  if (existingContent) contentId = existingContent.id
  else {
    const locale = book?.locale ?? sourceToLocale(params.externalSource)
    const introduction = book
      ? await fetchBookIntroduction({ isbn: String(book.metadata.isbn), locale: book.locale }).catch(() => null)
      : null
    const hasIntroduction = !!introduction?.source && !!introduction.description?.trim()
    const sourceUrl = typeof book?.metadata.link === 'string' ? book.metadata.link : null
    const localeRow = {
      locale,
      title: book?.title ?? params.title,
      creator: book?.creator ?? (params.creator || null),
      thumbnail_url: book ? book.coverImageUrl : params.thumbnailUrl || null,
      description: book ? (hasIntroduction ? introduction!.source : null) : params.description || null,
      ...(book && { isbn: book.metadata.isbn }),
      publisher: book ? book.metadata.publisher : params.publisher || null,
      sources: {
        ...sourceToJsonb(book?.externalSource ?? params.externalSource),
        ...(book && externalBookWorkKey(book) && { workKey: externalBookWorkKey(book) }),
        ...(book && sourceUrl && { isbn: sourceUrl, title: sourceUrl, creator: sourceUrl, publisher: sourceUrl, thumbnail: book.coverImageUrl ? sourceUrl : 'confirmed_unavailable' }),
        ...(hasIntroduction && { description: introduction!.sourceUrl, description_method: 'provider', description_source_locale: locale }),
      },
      verified: true,
    }
    // 새 콘텐츠 생성 (id 자동 생성)
    const { data: newContent, error: contentError } = await db
      .from('contents')
      .insert({
        type: params.type,
        subtype: params.subtype || null,
        release_date: book ? null : params.releaseDate || null,
        metadata: book ? withoutBookDescription(book.metadata) : params.metadata ?? null,
        external_id: book?.externalId ?? params.id,
        external_source: book?.externalSource ?? params.externalSource ?? null,
      })
      .select('id')
      .single()

    if (contentError) return handleDatabaseError(contentError, { context: 'content', logPrefix: '[콘텐츠 생성]' })
    if (!newContent) return failure('DB_ERROR', '새 작품의 저장 결과를 확인하지 못했습니다.')
    contentId = newContent.id

    // content_locales에 로케일 데이터 저장
    const { error: localeError } = await db.from('content_locales').insert({ content_id: contentId, ...localeRow })
    if (localeError) {
      // 순차 REST 호출의 DELETE는 다른 호출이 붙인 감상까지 CASCADE로 지울 수 있다.
      // 생성 ID를 운영 감사에 남기고, 회원 기록은 만들지 않은 채 명확히 실패한다.
      console.error('[콘텐츠 locale 저장 미완료]', { contentId, type: params.type, error: localeError })
      return handleDatabaseError(localeError, { context: 'content', logPrefix: '[콘텐츠 locale 저장]' })
    }

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

      if (fetchError) return handleDatabaseError(fetchError, { context: 'content', logPrefix: '[기존 감상 조회]' })
      if (!existing) return failure('CONFLICT', '기존 감상 기록을 확인하지 못했습니다. 다시 시도해주세요.')

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
  if (!userContent) return failure('DB_ERROR', '감상 기록의 저장 결과를 확인하지 못했습니다.')

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
