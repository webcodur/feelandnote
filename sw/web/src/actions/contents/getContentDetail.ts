'use server'

import { cache } from 'react'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { getContentById } from './getContentById'
import { fetchContentMetadata } from './fetchContentMetadata'
import { getPublicReviewFeed, getReviewFeed, type ReviewFeedItem } from './getReviewFeed'
import { getProfile } from '@/actions/user'
import {
  getFictionCharactersForContent,
  type FictionSourceCharacter,
} from '@/actions/fiction/getFictionSources'
import { getCuratedEntriesForContent } from '@/actions/library/curated'
import type { ContentCuratedEntry } from '@/actions/library/types'
import type { CategoryId } from '@/constants/categories'
import type { ContentType, ContentStatus } from '@/types/database'
import type { AffiliateLink } from '@/constants/affiliatePlatforms'
import { getLocale } from 'next-intl/server'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import { cachedDetail } from '@/lib/cache'

// #region 타입 정의
export interface ContentDetailData {
  content: {
    id: string
    externalId: string
    title: string
    creator?: string
    thumbnail?: string
    description?: string
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
  fictionCharacters: FictionSourceCharacter[]
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

// #region 콘텐츠 자체 정보 (인증 비의존, 캐시)
async function fetchContentDataPublic(
  contentId: string,
  category: CategoryId | null,
  locale: string,
): Promise<ContentDetailData['content'] | null> {
  const supabase = createStaticClient()
  const contentSelect = `id, external_id, external_source, type, release_date, metadata, content_locales(${CL_SELECT})`

  function buildDbContent(raw: Record<string, unknown>) {
    const locales = raw.content_locales as ContentLocaleRow[] | null
    const flat = flattenLocales(locales, locale)
    return {
      id: raw.id as string,
      external_id: raw.external_id as string | null,
      external_source: raw.external_source as string | undefined,
      type: raw.type as string,
      metadata: raw.metadata as Record<string, unknown> | null,
      title: flat.title,
      creator: flat.creator,
      thumbnail_url: flat.thumbnail_url,
      description: getLocaleDescription(locales, locale),
      publisher: getLocalePublisher(locales, locale),
      release_date: raw.release_date as string | null,
      affiliate_url: flat.affiliate_url,
    }
  }

  // UUID 또는 external_id로 contents 조회
  let dbContent: ReturnType<typeof buildDbContent> | null = null

  const { data: byId } = await supabase
    .from('contents')
    .select(contentSelect)
    .eq('id', contentId)
    .maybeSingle()

  if (byId) {
    dbContent = buildDbContent(byId as Record<string, unknown>)
  } else {
    const { data: byExternalId } = await supabase
      .from('contents')
      .select(contentSelect)
      .eq('external_id', contentId)
      .maybeSingle()
    if (byExternalId) {
      dbContent = buildDbContent(byExternalId as Record<string, unknown>)
    }
  }

  const isMetaDescUsable = (source?: string) =>
    locale === 'ko' || source === 'google_books' || source === 'igdb'

  if (dbContent) {
    const categoryId = TYPE_TO_CATEGORY[dbContent.type as ContentType]
    const externalId = dbContent.external_id || dbContent.id
    const storedMetadata = dbContent.metadata && Object.keys(dbContent.metadata).length > 0
      ? dbContent.metadata
      : null
    const metadataResult = dbContent.type === 'MUSIC' && storedMetadata
      ? null
      : await fetchContentMetadata(externalId, dbContent.type as ContentType, dbContent.external_source)
    const dbMetaDesc = isMetaDescUsable(dbContent.external_source)
      ? (metadataResult?.metadata?.description as string)
      : undefined
    const mergedMetadata = metadataResult?.metadata || storedMetadata
      ? { ...(metadataResult?.metadata ?? {}), ...(storedMetadata ?? {}) }
      : null

    const dbMetadata = overrideBookLink(
      mergedMetadata
        ? { ...mergedMetadata, ...(dbContent.publisher && { publisher: dbContent.publisher }) }
        : mergedMetadata,
      locale, dbContent.type
    )

    return {
      id: dbContent.id,
      externalId,
      title: dbContent.title,
      creator: dbContent.creator || undefined,
      thumbnail: dbContent.thumbnail_url || undefined,
      description: dbContent.description || dbMetaDesc || undefined,
      releaseDate: dbContent.release_date || undefined,
      type: dbContent.type as ContentType,
      category: categoryId,
      metadata: dbMetadata,
      affiliateLinks: (dbContent.affiliate_url as unknown as AffiliateLink[])?.length
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
    description: apiContent.description || undefined,
    releaseDate: apiContent.releaseDate || undefined,
    type: TYPE_MAP[category],
    category,
    metadata: apiContent.metadata || null,
  }
}

// 콘텐츠 자체 정보(제목·저자·소개문)는 BO에서 편집할 때만 바뀐다. 사용자 활동으로 변하지 않으므로
// 셀럽 프로필과 같은 수명을 준다. 사이트맵에 콘텐츠 상세 13,330면을 등재(2026-07-15)한 뒤로는
// 크롤러 스윕마다 이 조회가 콜드 미스를 내던 구간이라 1시간 수명이 그대로 egress가 됐다.
// 감상문 피드(getReviewFeed)는 사용자 활동으로 변하므로 1시간을 유지한다.
/* 작품 한 건짜리 조회 — 항목 태그를 달아 그 한 건만 비울 수 있게 한다.
   여기서 받는 contentId는 UUID일 수도 external_id일 수도 있어 그대로 식별자로 쓴다. */
const fetchContentDataPublicCached = (contentId: string, category: CategoryId | null, locale: string) =>
  cachedDetail(
    CACHE_TAGS.CONTENTS,
    contentId,
    ['content-data-public', contentId, category ?? '', locale],
    () => fetchContentDataPublic(contentId, category, locale),
  )
// #endregion

// #region 본인 기록 (인증 의존, 캐시 외부)
async function fetchUserRecord(
  userId: string,
  contentId: string,
): Promise<ContentDetailData['userRecord']> {
  const supabase = await createClient()
  const { data } = await supabase
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
  const content = await fetchContentDataPublicCached(contentId, null, locale)
  if (!content) return null

  const [initialReviews, fictionCharacters, curatedEntries] = await Promise.all([
    getPublicReviewFeed({ contentId: content.id, limit: 10 }, locale),
    getFictionCharactersForContent(content.id, locale),
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
    fetchContentDataPublicCached(contentId, category ?? null, locale),
    profile ? fetchUserRecord(profile.id, contentId) : Promise.resolve(null),
  ])

  if (!content) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  const [initialReviews, fictionCharacters, curatedEntries] = await Promise.all([
    reviewsPromise,
    getFictionCharactersForContent(content.id, locale),
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
