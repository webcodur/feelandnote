'use server'

import { createClient } from '@/lib/supabase/server'
import { getContentById, type ContentDetail } from './getContentById'
import { fetchContentMetadata } from './fetchContentMetadata'
import { getReviewFeed, type ReviewFeedItem } from './getReviewFeed'
import { getProfile } from '@/actions/user'
import type { CategoryId } from '@/constants/categories'
import type { ContentType, ContentStatus } from '@/types/database'
import type { AffiliateLink } from '@/constants/affiliatePlatforms'
import { getLocale } from 'next-intl/server'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

// #region 타입 정의
export interface ContentDetailData {
  // 콘텐츠 정보
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
  // 사용자 기록 (없으면 null)
  userRecord: {
    id: string
    status: ContentStatus
    rating: number | null
    review: string | null
    isSpoiler: boolean
    createdAt: string
    updatedAt: string
  } | null
  // 메타 정보
  isLoggedIn: boolean
  // 초기 리뷰 데이터 (서버에서 프리페치)
  initialReviews: ReviewFeedItem[]
}
// #endregion

// 타입 매핑
const TYPE_TO_CATEGORY: Record<ContentType, CategoryId> = {
  BOOK: 'book',
  VIDEO: 'video',
  GAME: 'game',
  MUSIC: 'music',
  CERTIFICATE: 'certificate',
}

/** locale에 맞는 description만 추출 (cross-locale 폴백 방지) */
function getLocaleDescription(locales: ContentLocaleRow[] | null | undefined, locale: string): string | undefined {
  const row = locales?.find(l => l.locale === locale)
  return row?.description ?? undefined
}

/** locale에 맞는 publisher만 추출 (cross-locale 폴백 방지) */
function getLocalePublisher(locales: ContentLocaleRow[] | null | undefined, locale: string): string | undefined {
  const row = locales?.find(l => l.locale === locale)
  return row?.publisher ?? undefined
}

/** en locale BOOK → "상세정보 보기" link를 Google Books로 교체 */
function overrideBookLink(metadata: Record<string, unknown> | null, bookLocale: string, type: string): Record<string, unknown> | null {
  if (!metadata || bookLocale !== 'en' || type !== 'BOOK') return metadata
  const isbn = metadata.isbn as string | undefined
  if (isbn) {
    return { ...metadata, link: `https://books.google.com/books?vid=ISBN${isbn}` }
  }
  return metadata
}

export async function getContentDetail(
  contentId: string,
  category?: CategoryId
): Promise<ContentDetailData> {
  const supabase = await createClient()
  const locale = await getLocale()
  // 리뷰 피드는 contentId만 필요하므로 콘텐츠 조회와 병렬 시작
  const reviewsPromise = getReviewFeed({ contentId, limit: 10 })
  const profile = await getProfile()

  // 1. 로그인 사용자의 기록 확인
  let userRecord: ContentDetailData['userRecord'] = null
  let savedContent: { id: string; external_id: string | null; external_source?: string; type: ContentType; title: string; creator?: string; thumbnail_url?: string; description?: string; publisher?: string; release_date?: string; affiliate_url?: AffiliateLink[] | null } | null = null

  if (profile) {
    const { data } = await supabase
      .from('user_contents')
      .select(`
        id, status, rating, review, is_spoiler, created_at, updated_at,
        content:contents(id, external_id, external_source, type, release_date, content_locales(${CL_SELECT}))
      `)
      .eq('user_id', profile.id)
      .eq('content_id', contentId)
      .single()

    if (data) {
      const rawContent = (Array.isArray(data.content) ? data.content[0] : data.content) as Record<string, unknown>
      const locales = rawContent?.content_locales as ContentLocaleRow[] | null
      const flat = flattenLocales(locales, locale)
      savedContent = {
        id: rawContent.id as string,
        external_id: rawContent.external_id as string | null,
        external_source: rawContent.external_source as string | undefined,
        type: rawContent.type as ContentType,
        title: flat.title,
        creator: flat.creator ?? undefined,
        thumbnail_url: flat.thumbnail_url ?? undefined,
        description: getLocaleDescription(locales, locale),
        publisher: getLocalePublisher(locales, locale),
        release_date: rawContent.release_date as string | undefined,
        affiliate_url: flat.affiliate_url as AffiliateLink[] | null,
      }
      userRecord = {
        id: data.id,
        status: data.status as ContentStatus,
        rating: data.rating,
        review: data.review,
        isSpoiler: data.is_spoiler ?? false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    }
  }

  // 2. 콘텐츠 정보 구성
  let contentData: ContentDetailData['content']

  // 메타데이터 description 폴백: locale과 소스 언어가 일치할 때만 사용
  const isMetaDescUsable = (source?: string) =>
    locale === 'ko' || source === 'google_books' || source === 'igdb' || source === 'spotify'

  if (savedContent) {
    // DB에 저장된 콘텐츠 정보 사용
    const categoryId = TYPE_TO_CATEGORY[savedContent.type]
    const externalId = savedContent.external_id || savedContent.id
    const metadataResult = await fetchContentMetadata(externalId, savedContent.type, savedContent.external_source)
    const metaDesc = isMetaDescUsable(savedContent.external_source)
      ? (metadataResult.metadata?.description as string)
      : undefined

    // locale별 content_locales 필드로 메타데이터 오버라이드
    const metadata = overrideBookLink(
      metadataResult.metadata
        ? { ...metadataResult.metadata, ...(savedContent.publisher && { publisher: savedContent.publisher }) }
        : metadataResult.metadata,
      locale, savedContent.type
    )

    contentData = {
      id: savedContent.id,
      externalId,
      title: savedContent.title,
      creator: savedContent.creator || undefined,
      thumbnail: savedContent.thumbnail_url || undefined,
      description: savedContent.description || metaDesc || undefined,
      releaseDate: savedContent.release_date || undefined,
      type: savedContent.type,
      category: categoryId,
      metadata,
      affiliateLinks: savedContent.affiliate_url?.length ? savedContent.affiliate_url : undefined,
    }
  } else {
    // contents 테이블에서 직접 조회 (셀럽 콘텐츠 등 본인 기록이 아닌 경우)
    // UUID 또는 external_id로 검색
    let dbContent: { id: string; external_id: string | null; external_source?: string; type: string; title: string; creator: string | null; thumbnail_url: string | null; description?: string; publisher?: string; release_date: string | null; affiliate_url: unknown } | null = null

    const contentSelect = `id, external_id, external_source, type, release_date, content_locales(${CL_SELECT})`

    function buildDbContent(raw: Record<string, unknown>) {
      const locales = raw.content_locales as ContentLocaleRow[] | null
      const flat = flattenLocales(locales, locale)
      return {
        id: raw.id as string,
        external_id: raw.external_id as string | null,
        external_source: raw.external_source as string | undefined,
        type: raw.type as string,
        title: flat.title,
        creator: flat.creator,
        thumbnail_url: flat.thumbnail_url,
        description: getLocaleDescription(locales, locale),
        publisher: getLocalePublisher(locales, locale),
        release_date: raw.release_date as string | null,
        affiliate_url: flat.affiliate_url,
      }
    }

    const { data: byId } = await supabase
      .from('contents')
      .select(contentSelect)
      .eq('id', contentId)
      .maybeSingle()

    if (byId) {
      dbContent = buildDbContent(byId as Record<string, unknown>)
    } else {
      // UUID가 아닌 경우 external_id로 재검색
      const { data: byExternalId } = await supabase
        .from('contents')
        .select(contentSelect)
        .eq('external_id', contentId)
        .maybeSingle()
      if (byExternalId) {
        dbContent = buildDbContent(byExternalId as Record<string, unknown>)
      }
    }

    if (dbContent) {
      const categoryId = TYPE_TO_CATEGORY[dbContent.type as ContentType]
      const externalId = dbContent.external_id || dbContent.id
      const metadataResult = await fetchContentMetadata(externalId, dbContent.type as ContentType, dbContent.external_source)
      const dbMetaDesc = isMetaDescUsable(dbContent.external_source)
        ? (metadataResult.metadata?.description as string)
        : undefined

      // locale별 content_locales 필드로 메타데이터 오버라이드
      const dbMetadata = overrideBookLink(
        metadataResult.metadata
          ? { ...metadataResult.metadata, ...(dbContent.publisher && { publisher: dbContent.publisher }) }
          : metadataResult.metadata,
        locale, dbContent.type
      )

      contentData = {
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
        affiliateLinks: (dbContent.affiliate_url as unknown as AffiliateLink[])?.length ? (dbContent.affiliate_url as unknown as AffiliateLink[]) : undefined,
      }
    } else {
      // 외부 API에서 조회 (category 필수, contentId를 externalId로 사용)
      if (!category) {
        throw new Error('카테고리가 필요합니다')
      }

      const apiContent = await getContentById(contentId, category)
      if (!apiContent) {
        throw new Error('콘텐츠를 찾을 수 없습니다')
      }

      const typeMap: Record<CategoryId, ContentType> = {
        book: 'BOOK',
        video: 'VIDEO',
        game: 'GAME',
        music: 'MUSIC',
        certificate: 'CERTIFICATE',
        all: 'BOOK',
      }

      contentData = {
        id: apiContent.id,
        externalId: apiContent.id,
        title: apiContent.title,
        creator: apiContent.creator || undefined,
        thumbnail: apiContent.thumbnail || undefined,
        description: apiContent.description || undefined,
        releaseDate: apiContent.releaseDate || undefined,
        type: typeMap[category],
        category,
        metadata: apiContent.metadata || null,
      }
    }
  }

  // 3. 리뷰 데이터 (병렬 시작된 프로미스 대기)
  const initialReviews = await reviewsPromise

  return {
    content: contentData,
    userRecord,
    isLoggedIn: !!profile,
    initialReviews,
  }
}
