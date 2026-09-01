'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { cachedList, cachedDetail } from '@/lib/cache'
import type { ContentType, ContentStatus, VisibilityType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import {
  CL_SELECT_LIST,
  CL_SELECT_LIST_WITH_AFFILIATE,
  flattenLocales,
  type ContentLocaleRow,
} from '@/lib/utils/content-locale'
import { sanitizeSearchTerm } from '@/lib/utils/search-sanitize'
import { getAffiliateBooksForCeleb } from '@/actions/home/getAffiliateBooks'

type SortByOption = 'recent' | 'rating_desc' | 'rating_asc'

interface GetUserContentsParams {
  userId: string
  type?: ContentType
  status?: ContentStatus
  page?: number
  limit?: number
  search?: string  // 제목/저자 검색
  hasReview?: boolean  // true=리뷰 있음, false=리뷰 없음
  sortBy?: SortByOption  // 서버 정렬
}

export interface UserContentPublic {
  id: string
  content_id: string
  status: ContentStatus
  is_recommended: boolean
  visibility: VisibilityType | null
  created_at: string
  source_url: string | null
  content: {
    id: string
    type: ContentType
    title: string
    creator: string | null
    thumbnail_url: string | null
    metadata: Record<string, unknown> | null
    user_count: number | null
    title_ko: string | null
    title_en: string | null
    creator_en: string | null
    isbn_en: string | null
    thumbnail_en: string | null
    has_en_edition: boolean | null
    affiliate_url?: unknown
  }
  // 공개된 기록 요약
  public_record?: {
    rating: number | null
    content_preview: string | null
    content_preview_en: string | null
    review_presets: string[] | null
    is_spoiler?: boolean
  } | null
}

export interface GetUserContentsResponse {
  items: UserContentPublic[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

interface QueryUserContentsOptions {
  userId: string
  ownerKind: 'member' | 'celeb'
  type?: ContentType
  page: number
  limit: number
  search?: string
  hasReview?: boolean
  sortBy: SortByOption
  locale: string
  isOwnProfile: boolean
  preferredContentIds?: string[]
}

// 회원·인물 감상 테이블의 공통 필드만 함께 읽는다. 별점은 회원 기록에만 있다.
// 원본과 소유자 FK는 ownerKind로 분기하고 반환 형태는 기존 API를 유지한다.
async function queryUserContents(
  supabase: SupabaseClient,
  opts: QueryUserContentsOptions,
): Promise<GetUserContentsResponse> {
  const {
    userId,
    ownerKind,
    type,
    page,
    limit,
    search,
    hasReview,
    sortBy,
    locale,
    isOwnProfile,
    preferredContentIds = [],
  } = opts
  const offset = (page - 1) * limit
  const archiveTable = ownerKind === 'celeb' ? 'celeb_contents' : 'member_contents'
  const ownerColumn = ownerKind === 'celeb' ? 'celeb_id' : 'member_id'

  // isbn은 isbn_en 플래튼에 필요. description/publisher/affiliate_url은 미사용 — 제외
  const localeFields = ownerKind === 'celeb' ? CL_SELECT_LIST_WITH_AFFILIATE : CL_SELECT_LIST
  const contentFields = `id, type, metadata, user_count:record_count, content_locales(${localeFields}, isbn)`

  // 검색 필터 - content_locales에서 2-step 검색 (.or() 보간 인젝션 차단)
  let searchContentIds: string[] | null = null
  const safeSearch = search ? sanitizeSearchTerm(search) : ''
  if (safeSearch.length >= 2) {
    const searchTerm = `%${safeSearch}%`
    const { data: matchIds } = await supabase
      .from('content_locales')
      .select('content_id')
      .or(`title.ilike.${searchTerm},creator.ilike.${searchTerm}`)
    if (!matchIds?.length) return { items: [], total: 0, page, totalPages: 0, hasMore: false }
    searchContentIds = [...new Set(matchIds.map(m => m.content_id))]
  }

  const needsInnerJoin = !!type
  const contentJoin = needsInnerJoin ? `content:contents!inner(${contentFields})` : `content:contents(${contentFields})`

  // 영어 감상문은 en 화면에서만 쓰인다 — ko 응답에서 수신 제외 (egress 절감)
  const reviewEnSelect = locale === 'en' ? 'review_en,' : ''
  const memberRatingSelect = ownerKind === 'member' ? 'rating,' : ''
  const archiveSelect: string = `
    id,
    content_id,
    status,
    is_recommended,
    ${memberRatingSelect}
    review,
    ${reviewEnSelect}
    review_presets,
    is_spoiler,
    visibility,
    created_at,
    source_url,
    ${contentJoin}
  `

  const buildQuery = () => {
    let query = supabase
      .from(archiveTable)
      .select(archiveSelect, { count: 'exact' })
      .eq(ownerColumn, userId)

  // 정렬
  if (ownerKind === 'member' && sortBy === 'rating_desc') {
    query = query.order('rating', { ascending: false, nullsFirst: false })
  } else if (ownerKind === 'member' && sortBy === 'rating_asc') {
    query = query.order('rating', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  // 타인 프로필 조회 시 public만 표시
  if (!isOwnProfile) {
    query = query.eq('visibility', 'public')
  }

  if (type) {
    query = query.eq('content.type', type)
  }

  // status 필터 제거 (사용자 요구사항: status 무관하게 리뷰 유무로만 판단)

  // 검색 결과 content_id 필터
  if (searchContentIds) {
    query = query.in('content_id', searchContentIds)
  }

  // 리뷰 필터
  if (hasReview === true) {
    // 리뷰가 있는 경우: null이 아니고 빈 문자열도 아닌 경우
    query = query.not('review', 'is', null).neq('review', '')
  } else if (hasReview === false) {
    // 리뷰가 없는 경우: null이거나 빈 문자열인 경우
    query = query.or('review.is.null,review.eq.')
  }

    return query
  }

  const affiliatePriorityIds = ownerKind === 'celeb'
    ? [...new Set(preferredContentIds)]
    : []
  let userContents: unknown[] | null
  let count: number | null
  let error: unknown

  if (affiliatePriorityIds.length === 0) {
    const result = await buildQuery().range(offset, offset + limit - 1)
    userContents = result.data
    count = result.count
    error = result.error
  } else {
    const priorityResult = await buildQuery()
      .in('content_id', affiliatePriorityIds)
      .limit(affiliatePriorityIds.length)
    if (priorityResult.error) {
      userContents = null
      count = null
      error = priorityResult.error
    } else {
      const priorityRows = (priorityResult.data ?? []) as unknown[]
      const priorityCount = priorityRows.length
      const priorityPage = priorityRows.slice(offset, offset + limit)
      const remaining = limit - priorityPage.length
      const regularOffset = Math.max(0, offset - priorityCount)
      const regularResult = await buildQuery()
        .not('content_id', 'in', `(${affiliatePriorityIds.join(',')})`)
        .range(
          remaining > 0 ? regularOffset : 0,
          remaining > 0 ? regularOffset + remaining - 1 : 0,
        )
      userContents = regularResult.error
        ? null
        : [...priorityPage, ...((remaining > 0 ? regularResult.data : []) ?? [])]
      count = regularResult.error
        ? null
        : priorityCount + (regularResult.count ?? 0)
      error = regularResult.error
    }
  }

  if (error) {
    console.error('콘텐츠 조회 에러:', error)
    throw new Error('콘텐츠 목록을 불러오는데 실패했습니다')
  }

  // content가 null인 항목 필터링 + content_locales 플래튼
  const validContents = ((userContents || []) as unknown as Record<string, unknown>[])
    .filter(item => item.content !== null)

  const items: UserContentPublic[] = validContents.map(item => {
    const rawContent = Array.isArray(item.content) ? item.content[0] : item.content
    const c = rawContent as unknown as Record<string, unknown>
    const locales = c.content_locales as ContentLocaleRow[] | null
    const flat = flattenLocales(locales, locale)
    const raw = item as unknown as Record<string, unknown>
    const rating = ownerKind === 'member' ? (raw.rating as number | null) : null
    return {
      id: item.id as string,
      content_id: raw.content_id as string,
      status: item.status as ContentStatus,
      is_recommended: (raw.is_recommended as boolean) ?? false,
      visibility: raw.visibility as VisibilityType | null,
      created_at: raw.created_at as string,
      source_url: raw.source_url as string | null,
      content: {
        id: c.id as string,
        type: c.type as ContentType,
        title: flat.title,
        creator: flat.creator,
        thumbnail_url: flat.thumbnail_url,
        metadata: c.metadata as Record<string, unknown> | null,
        user_count: c.user_count as number | null,
        title_ko: flat.title_ko,
        title_en: flat.title_en,
        creator_en: flat.creator_en,
        isbn_en: flat.isbn_en,
        thumbnail_en: flat.thumbnail_en,
        has_en_edition: flat.has_en_edition,
        affiliate_url: flat.affiliate_url,
      },
      public_record: (rating !== null || raw.review || ((raw.review_presets as string[] | null)?.length)) ? {
        rating,
        content_preview: (raw.review as string) || null,
        content_preview_en: (raw.review_en as string | undefined) || null,
        review_presets: (raw.review_presets as string[]) || null,
        is_spoiler: raw.is_spoiler as boolean,
      } : null,
    }
  })

  const total = count || 0

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: offset + items.length < total,
  }
}

type PublicContentsArgs = [
  userId: string,
  type: ContentType | undefined,
  page: number,
  limit: number,
  search: string | undefined,
  hasReview: boolean | undefined,
  sortBy: SortByOption,
  locale: string,
]

type CelebContentsArgs = [...PublicContentsArgs, preferredContentIds: string[]]

async function getCelebAffiliatePriorityIds(userId: string, locale: string): Promise<string[]> {
  if (locale !== 'ko') return []
  const result = await getAffiliateBooksForCeleb(userId, 'coupang', 6)
  return result.source === 'read' ? result.books.map((book) => book.contentId) : []
}

const queryPublicUserContents = (...args: PublicContentsArgs) => {
  const [userId, type, page, limit, search, hasReview, sortBy, locale] = args
  return queryUserContents(createStaticClient(), {
    userId, ownerKind: 'member', type, page, limit, search, hasReview, sortBy, locale,
    isOwnProfile: false,
  })
}

// 타인 회원 서재 — 공개 테이블(member_contents, contents, content_locales)만 읽으므로 캐시.
// 일반 사용자 서재를 남이 열람하는 경로. 본인이 책을 추가하면 곧 반영돼야 하므로 1시간.
const getCachedPublicUserContents = (...args: Parameters<typeof queryPublicUserContents>) =>
  cachedList(CACHE_TAGS.CONTENTS, ['public-user-contents', ...args.map((a) => String(a ?? ''))], () =>
    queryPublicUserContents(...args),
  )

// 셀럽 서재 SSR 전용 캐시 — 위와 키를 분리하고 수명을 7일로 둔다.
// 셀럽 서재는 BO에서 편집할 때만 바뀌며, 같은 페이지의 다른 조회(프로필·JSON-LD·대사·동시대 인물)가
// 전부 STATIC_REVALIDATE다. 이것만 1시간이면 크롤러가 셀럽 2,514면을 훑을 때마다 콜드 미스가 나
// 페이지당 8~10KB가 반복 전송된다(egress 사고 재발 경로). 이웃과 수명을 맞춘다.
// 인물 한 명의 서재라 그 인물 항목 태그를 단다 — 한 명을 고쳐도 나머지 서재는 그대로 둔다
const getCachedCelebLibraryContents = (...args: CelebContentsArgs) =>
  cachedDetail(
    CACHE_TAGS.CELEBS,
    args[0],
    ['celeb-library-contents-v3-affiliate-first', ...args.map((a) => String(a ?? ''))],
    () => {
      const [userId, type, page, limit, search, hasReview, sortBy, locale, preferredContentIds] = args
      return queryUserContents(createStaticClient(), {
        userId,
        ownerKind: 'celeb',
        type,
        page,
        limit,
        search,
        hasReview,
        sortBy,
        locale,
        isOwnProfile: false,
        preferredContentIds,
      })
    },
    { extraTags: [CACHE_TAGS.CONTENTS] },
  )

// 공개 프로필의 클라이언트 재조회용. viewer 모드는 이미 타인 화면으로 확정됐으므로
// auth.getUser()를 다시 거치지 않고 1시간 공개 캐시를 바로 읽는다.
export async function getPublicViewerContents(params: GetUserContentsParams): Promise<GetUserContentsResponse> {
  const { userId, type, page = 1, limit = 20, search, hasReview, sortBy = 'recent' } = params
  const locale = await getLocale()

  return getCachedPublicUserContents(userId, type, page, limit, search, hasReview, sortBy, locale)
}

/* 셀럽 서가의 클라이언트 재조회용.
   `getPublicViewerContents`는 회원 서재(member_contents)만 읽는다. 셀럽 화면이 그쪽을 부르면
   쪽을 넘기거나 조건을 바꾸는 순간 남의 테이블을 뒤져 목록이 사라진다(26.08.10 확인).
   대상이 셀럽인 화면은 반드시 이 함수를 쓴다 — SSR과 같은 캐시를 공유한다. */
export async function getPublicCelebContents(params: GetUserContentsParams): Promise<GetUserContentsResponse> {
  const { userId, type, page = 1, limit = 20, search, hasReview, sortBy = 'recent' } = params
  const locale = await getLocale()
  const preferredContentIds = await getCelebAffiliatePriorityIds(userId, locale)

  return getCachedCelebLibraryContents(
    userId,
    type,
    page,
    limit,
    search,
    hasReview,
    sortBy,
    locale,
    preferredContentIds,
  )
}

// 셀럽 상세 SSR용 — 대상이 항상 타인(셀럽)이므로 쿠키·인증을 읽지 않는다.
// 페이지 서버 렌더에서 직접 호출해 초기 HTML에 서가 목록·감상문을 싣는다(크롤러 노출).
export async function getPublicUserContents(
  params: GetUserContentsParams,
  requestLocale?: string,
): Promise<GetUserContentsResponse> {
  const { userId, type, page = 1, limit = 20, search, hasReview, sortBy = 'recent' } = params
  const locale = requestLocale ?? (await getLocale())
  const preferredContentIds = await getCelebAffiliatePriorityIds(userId, locale)

  return getCachedCelebLibraryContents(
    userId,
    type,
    page,
    limit,
    search,
    hasReview,
    sortBy,
    locale,
    preferredContentIds,
  )
}

export async function getUserContents(params: GetUserContentsParams): Promise<GetUserContentsResponse> {
  const { userId, type, page = 1, limit = 20, search, hasReview, sortBy = 'recent' } = params
  const supabase = await createClient()
  const locale = await getLocale()

  // 현재 로그인한 사용자 확인 (viewer 의존 — 캐시 외부)
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwnProfile = currentUser?.id === userId

  if (isOwnProfile) {
    // egress-allow: 본인 서재 — 추가/삭제 즉시 반영 필요, 캐시 부적합
    return queryUserContents(supabase, {
      userId, ownerKind: 'member', type, page, limit, search, hasReview, sortBy, locale,
      isOwnProfile: true,
    })
  }

  return getCachedPublicUserContents(userId, type, page, limit, search, hasReview, sortBy, locale)
}
