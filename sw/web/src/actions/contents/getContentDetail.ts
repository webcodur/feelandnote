'use server'

import { cache } from 'react'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createClient } from '@/lib/db/server'
import { createStaticClient } from '@/lib/db/static'
import { getContentById } from './getContentById'
import { fetchContentMetadata, type ContentMetadata } from './fetchContentMetadata'
import { getPublicReviewFeed, getReviewFeed, type ReviewFeedItem } from './getReviewFeed'
import { getProfile } from '@/actions/user'
import {
  getFigureBookCharactersForContent,
  type FigureBookCharacter,
} from '@/actions/figure-books/getFigureBooks'
import {
  getFigureBookPurchasePlatform,
  mapFigureBookPurchaseOptions,
  type FigureBookEdition,
  type FigureBookPurchaseOptionRow,
} from '@/actions/figure-books/figureBookLocale'
import { getCuratedEntriesForContent } from '@/actions/library/curated'
import type { ContentCuratedEntry } from '@/actions/library/types'
import type { CategoryId } from '@/constants/categories'
import type { ContentType, ContentStatus } from '@/types/database'
import type { AffiliateLink } from '@/constants/affiliatePlatforms'
import { getLocale } from 'next-intl/server'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import { cachedDetail } from '@/lib/cache'
import {
  dropForeignDisplayText,
  pickIntroForLocale,
  stripLocalizedMeta,
} from '@/lib/utils/content-locale-text'
import { getBookIntroduction } from './fetchBookMetadata'
import { resolveBookIsbn, selectBookIntroduction, type BookIntroductionReference } from '@/lib/utils/book-description'
import { withoutBookDescription } from '@feelandnote/shared/lib/book-metadata'

// #region 타입 정의
export interface ContentDetailData {
  content: {
    id: string
    externalId: string
    title: string
    creator?: string
    thumbnail?: string
    description?: string
    bookIntroduction?: BookIntroductionReference | null
    releaseDate?: string
    type: ContentType
    category: CategoryId
    metadata?: Record<string, unknown> | null
    affiliateLinks?: AffiliateLink[]
  }
  userRecord: {
    id: string
    status: ContentStatus
    rating: number | null
    review: string | null
    isSpoiler: boolean
    createdAt: string
    updatedAt: string
  } | null
  isLoggedIn: boolean
  initialReviews: ReviewFeedItem[]
  fictionCharacters: FigureBookCharacter[]
  /** 이 작품을 뽑은 기관·목록 (대학 필독서·언론 선정·수상 이력) */
  curatedEntries: ContentCuratedEntry[]
}
// #endregion

const TYPE_TO_CATEGORY: Record<ContentType, CategoryId> = {
  BOOK: 'book',
  VIDEO: 'video',
  GAME: 'game',
  MUSIC: 'music',
}

const TYPE_MAP: Record<CategoryId, ContentType> = {
  book: 'BOOK',
  video: 'VIDEO',
  game: 'GAME',
  music: 'MUSIC',
  all: 'BOOK',
}

function getLocaleDescription(locales: ContentLocaleRow[] | null | undefined, locale: string): string | undefined {
  const row = locales?.find(l => l.locale === locale)
  return row?.description ?? undefined
}

function getLocalePublisher(locales: ContentLocaleRow[] | null | undefined, locale: string): string | undefined {
  const row = locales?.find(l => l.locale === locale)
  return row?.publisher ?? undefined
}

function overrideBookLink(metadata: Record<string, unknown> | null, bookLocale: string, type: string): Record<string, unknown> | null {
  if (!metadata || bookLocale !== 'en' || type !== 'BOOK') return metadata
  const isbn = metadata.isbn as string | undefined
  if (isbn) {
    return { ...metadata, link: `https://books.google.com/books?vid=ISBN${isbn}` }
  }
  return metadata
}

async function fetchDefaultFigureBookEdition(
  contentId: string,
  locale: string,
): Promise<(FigureBookEdition & { sources?: unknown }) | null> {
  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform) return null

  const db = createStaticClient()
  const { data, error } = await db
    .from('figure_book_purchase_options')
    .select('edition_id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order,platform,affiliate_url')
    .eq('content_id', contentId)
    .eq('locale', locale)
    .eq('platform', platform)
    .order('sort_order')
    .order('edition_id')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`원전 기본 판본 조회 실패: ${error.message}`)
  if (!data) return null
  const edition = mapFigureBookPurchaseOptions(
    [data as unknown as FigureBookPurchaseOptionRow],
    locale,
  )[0] ?? null
  if (!edition) return null
  const { data: stored, error: sourcesError } = await db.from('figure_book_editions')
    .select('sources').eq('id', edition.id).maybeSingle()
  if (sourcesError) throw new Error(`판본 소개 출처 조회 실패: ${sourcesError.message}`)
  return { ...edition, sources: stored?.sources }
}

// #region 콘텐츠 자체 정보 (인증 비의존, 캐시)
async function fetchContentDataPublic(
  contentId: string,
  category: CategoryId | null,
  locale: string,
): Promise<ContentDetailData['content'] | null> {
  const db = createStaticClient()
  const contentSelect = `id, external_id, external_source, type, release_date, metadata, content_locales(${CL_SELECT},sources), figure_book_contents(content_id)`

  function buildDbContent(raw: Record<string, unknown>) {
    const locales = raw.content_locales as ContentLocaleRow[] | null
    const flat = flattenLocales(locales, locale)
    const sourceMarker = raw.figure_book_contents
    return {
      id: raw.id as string,
      external_id: raw.external_id as string | null,
      external_source: raw.external_source as string | undefined,
      type: raw.type as string,
      metadata: raw.type === 'BOOK'
        ? withoutBookDescription((raw.metadata as Record<string, unknown> | null) ?? {})
        : raw.metadata as Record<string, unknown> | null,
      title: flat.title,
      creator: flat.creator,
      thumbnail_url: flat.thumbnail_url,
      description: getLocaleDescription(locales, locale),
      exactLocale: locales?.find((item) => item.locale === locale),
      publisher: getLocalePublisher(locales, locale),
      isbn_en: flat.isbn_en,
      isbn: locales?.find((item) => item.locale === locale)?.isbn,
      release_date: raw.release_date as string | null,
      affiliate_url: flat.affiliate_url,
      is_figure_book: Array.isArray(sourceMarker)
        ? sourceMarker.length > 0
        : Boolean(sourceMarker && typeof sourceMarker === 'object'),
    }
  }

  // UUID 또는 external_id로 contents 조회
  let dbContent: ReturnType<typeof buildDbContent> | null = null

  const { data: byId } = await db
    .from('contents')
    .select(contentSelect)
    .eq('id', contentId)
    .maybeSingle()

  if (byId) {
    dbContent = buildDbContent(byId as Record<string, unknown>)
  } else {
    const { data: byExternalId } = await db
      .from('contents')
      .select(contentSelect)
      .eq('external_id', contentId)
      .maybeSingle()
    if (byExternalId) {
      dbContent = buildDbContent(byExternalId as Record<string, unknown>)
    }
  }

  // 도서 외 매체는 실제로 응답한 출처로 소개의 표시 언어를 판정한다.
  const isMetaDescUsable = (source?: string) =>
    locale === 'ko' || source === 'google_books' || source === 'igdb' || source === 'tmdb'

  if (dbContent) {
    const categoryId = TYPE_TO_CATEGORY[dbContent.type as ContentType]
    const externalId = dbContent.external_id || dbContent.id
    const storedMetadata = dbContent.metadata && Object.keys(dbContent.metadata).length > 0
      ? dbContent.metadata
      : null
    const sourceEdition = dbContent.type === 'BOOK' && dbContent.is_figure_book
      ? await fetchDefaultFigureBookEdition(dbContent.id, locale)
      : null
    const bookDisplay = dbContent.type === 'BOOK'
      ? selectBookIntroduction(locale, sourceEdition ? { ...sourceEdition, locale } : null, {
        ...dbContent.exactLocale, locale, isbn: resolveBookIsbn(locale, null, dbContent.isbn, externalId),
      })
      : null
    const metadataResult: ContentMetadata | null = dbContent.type === 'BOOK'
      ? { id: externalId, metadata: { isbn: resolveBookIsbn(locale, sourceEdition?.isbn, dbContent.isbn, externalId) } }
      : await (
      dbContent.type === 'MUSIC' && storedMetadata
        ? Promise.resolve(null)
        : fetchContentMetadata(externalId, dbContent.type as ContentType, dbContent.external_source, locale === 'en' ? 'en' : 'ko')
      )
    /* 소개문 필드 이름이 출처마다 다르다 — TMDB는 overview, IGDB는 summary·storyline이다. */
    const fetchedMeta = metadataResult?.metadata ?? {}
    const dbMetaDesc = (dbContent.type === 'BOOK' || isMetaDescUsable(metadataResult?.source ?? dbContent.external_source))
      ? ([fetchedMeta.description, fetchedMeta.overview, fetchedMeta.storyline, fetchedMeta.summary]
          .find((value): value is string => typeof value === 'string' && value.trim() !== ''))
      : undefined
    const mergedMetadata = metadataResult?.metadata || storedMetadata
      ? { ...(metadataResult?.metadata ?? {}), ...stripLocalizedMeta(locale, storedMetadata) }
      : null

    const localizedMetadata = dropForeignDisplayText(
      locale,
      overrideBookLink(
        mergedMetadata
          ? { ...mergedMetadata, ...(dbContent.publisher && { publisher: dbContent.publisher }) }
          : mergedMetadata,
        locale, dbContent.type
      ),
    )
    const dbMetadata = sourceEdition
      ? {
          ...(localizedMetadata ?? {}),
          ...(sourceEdition.publisher && { publisher: sourceEdition.publisher }),
          ...(sourceEdition.isbn && { isbn: sourceEdition.isbn }),
        }
      : dbContent.type === 'BOOK'
        ? { ...localizedMetadata, isbn: resolveBookIsbn(locale, null, dbContent.isbn, externalId) }
        : localizedMetadata

    return {
      id: dbContent.id,
      externalId,
      title: sourceEdition?.title || dbContent.title,
      creator: sourceEdition?.creator || dbContent.creator || undefined,
      thumbnail: sourceEdition?.thumbnailUrl || dbContent.thumbnail_url || undefined,
      description: (bookDisplay ? bookDisplay.description : pickIntroForLocale(locale, [dbContent.description, dbMetaDesc])) ?? undefined,
      ...(bookDisplay ? { bookIntroduction: bookDisplay.bookIntroduction } : {}),
      releaseDate: sourceEdition?.releaseDate || dbContent.release_date || undefined,
      type: dbContent.type as ContentType,
      category: categoryId,
      metadata: dbMetadata,
      affiliateLinks: dbContent.is_figure_book
        // 구매처가 없는 판본도 책장에 서므로 링크가 실제로 있을 때만 내보낸다.
        ? sourceEdition?.platform && sourceEdition.purchaseUrl
          ? [{ platform: sourceEdition.platform, url: sourceEdition.purchaseUrl }]
          : undefined
        : (dbContent.affiliate_url as unknown as AffiliateLink[])?.length
            ? (dbContent.affiliate_url as unknown as AffiliateLink[])
            : undefined,
    }
  }

  // 외부 API 폴백 (category 필요)
  if (!category) return null

  const apiContent = await getContentById(contentId, category)
  if (!apiContent) return null

  return {
    id: apiContent.id,
    externalId: apiContent.id,
    title: apiContent.title,
    creator: apiContent.creator || undefined,
    thumbnail: apiContent.thumbnail || undefined,
    description: (TYPE_MAP[category] === 'BOOK' ? pickIntroForLocale(locale, [apiContent.description]) : apiContent.description) || undefined,
    releaseDate: apiContent.releaseDate || undefined,
    type: TYPE_MAP[category],
    category,
    metadata: TYPE_MAP[category] === 'BOOK'
      ? dropForeignDisplayText(locale, withoutBookDescription(apiContent.metadata ?? {}))
      : apiContent.metadata || null,
  }
}

// 서지와 외부 소개는 정적 캐시 수명을 공유한다. 감상문 피드는 사용자 활동용 캐시를 쓴다.
/* 작품 한 건짜리 조회 — 항목 태그를 달아 그 한 건만 비울 수 있게 한다.
   여기서 받는 contentId는 UUID일 수도 external_id일 수도 있어 그대로 식별자로 쓴다. */
const fetchContentDataPublicCached = (contentId: string, category: CategoryId | null, locale: string) =>
  cachedDetail(
    CACHE_TAGS.CONTENTS,
    contentId,
    ['content-data-public-selected-book-intro-v9-compat', contentId, category ?? '', locale],
    () => fetchContentDataPublic(contentId, category, locale),
  )

// 외부 소개는 DB 서지 캐시 밖에서 읽는다. 일시 장애가 나도 서지와 구매 링크는 유지한다.
async function withBookIntroduction(
  content: ContentDetailData['content'] | null,
  locale: string,
): Promise<ContentDetailData['content'] | null> {
  if (!content || content.type !== 'BOOK' || !content.bookIntroduction) return content
  const { isbn, source, sourceUrl, legacyFallback } = content.bookIntroduction
  try {
    const description = await getBookIntroduction(isbn, locale, source, sourceUrl, legacyFallback)
    return {
      ...content,
      description: description ?? undefined,
    }
  } catch (error) {
    console.error('[withBookIntroduction]', isbn, error)
    return content
  }
}
// #endregion

// #region 본인 기록 (인증 의존, 캐시 외부)
async function fetchUserRecord(
  userId: string,
  contentId: string,
): Promise<ContentDetailData['userRecord']> {
  const db = await createClient()
  const { data } = await db
    .from('member_contents')
    .select('id, status, rating, review, is_spoiler, created_at, updated_at')
    .eq('member_id', userId)
    .eq('content_id', contentId)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    status: data.status as ContentStatus,
    rating: data.rating,
    review: data.review,
    isSpoiler: data.is_spoiler ?? false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
// #endregion

// 공개 상세 본문 — 쿠키와 viewer 정보를 읽지 않는다. 콘텐츠 URL 수가 많아 빌드 때
// 전부 만들지 않고, 첫 요청에 생성한 결과를 ISR 캐시로 공유한다.
export const getPublicContentDetail = cache(getPublicContentDetailInner)

async function getPublicContentDetailInner(
  contentId: string,
  locale: string,
): Promise<ContentDetailData | null> {
  const content = await withBookIntroduction(await fetchContentDataPublicCached(contentId, null, locale), locale)
  if (!content) return null

  const [initialReviews, fictionCharacters, curatedEntries] = await Promise.all([
    getPublicReviewFeed({ contentId: content.id, limit: 10 }, locale),
    getFigureBookCharactersForContent(content.id, locale),
    getCuratedEntriesForContent(content.id, locale),
  ])

  return {
    content,
    userRecord: null,
    isLoggedIn: false,
    initialReviews,
    fictionCharacters,
    curatedEntries,
  }
}

// 정적 본문이 hydration된 뒤 로그인 사용자에게만 개인 기록을 보강한다.
export async function getContentViewerState(
  contentId: string,
): Promise<Pick<ContentDetailData, 'userRecord' | 'isLoggedIn'>> {
  const profile = await getProfile()
  if (!profile) return { userRecord: null, isLoggedIn: false }

  return {
    userRecord: await fetchUserRecord(profile.id, contentId),
    isLoggedIn: true,
  }
}

// React.cache로 같은 RSC 요청(generateMetadata + default export 등) 안의 중복 호출 dedup
export const getContentDetail = cache(getContentDetailInner)

async function getContentDetailInner(
  contentId: string,
  category?: CategoryId,
): Promise<ContentDetailData> {
  const locale = await getLocale()
  const profile = await getProfile()
  // 리뷰 피드는 contentId만 필요 — 콘텐츠 조회와 병렬 시작
  const reviewsPromise = getReviewFeed({ contentId, limit: 10 })

  // 콘텐츠 정보(캐시)와 본인 기록(동적) 병렬
  const [content, userRecord] = await Promise.all([
    fetchContentDataPublicCached(contentId, category ?? null, locale).then((content) => withBookIntroduction(content, locale)),
    profile ? fetchUserRecord(profile.id, contentId) : Promise.resolve(null),
  ])

  if (!content) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  const [initialReviews, fictionCharacters, curatedEntries] = await Promise.all([
    reviewsPromise,
    getFigureBookCharactersForContent(content.id, locale),
    getCuratedEntriesForContent(content.id, locale),
  ])

  return {
    content,
    userRecord,
    isLoggedIn: !!profile,
    initialReviews,
    fictionCharacters,
    curatedEntries,
  }
}
