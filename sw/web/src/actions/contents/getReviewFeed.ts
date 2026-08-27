'use server'

import { unstable_cache } from 'next/cache'
import { throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { bulkTag, CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'

export interface ReviewFeedItem {
  id: string
  rating: number | null
  review: string
  review_en: string | null
  is_spoiler: boolean
  updated_at: string
  source_url: string | null
  user: {
    id: string
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    subject_kind: 'member' | 'celeb'
    profession?: string | null
    title?: string | null
    title_en?: string | null
    headline?: string | null
    headline_en?: string | null
    slug?: string | null
  }
}

interface GetReviewFeedParams {
  contentId: string
  limit?: number
  offset?: number
  excludeUserId?: string
}

// 도메인별 원본 조인은 단건이지만 PostgREST 응답을 방어적으로 배열까지 허용한다.
interface ReviewProfileRow {
  id: string
  nickname: string
  nickname_en?: string | null
  avatar_url: string | null
  profession?: string | null
  title?: string | null
  title_en?: string | null
  headline?: string | null
  headline_en?: string | null
  slug?: string | null
}

interface ReviewFeedRow {
  id: string
  rating?: number | null
  review: string | null
  review_en?: string | null
  is_spoiler: boolean
  updated_at: string
  source_url: string | null
  user: ReviewProfileRow | ReviewProfileRow[]
}

interface MemberReviewFeedRow extends Omit<ReviewFeedRow, 'user'> {
  member_id: string
}

function toReviewFeedItem(
  record: ReviewFeedRow,
  subjectKind: ReviewFeedItem['user']['subject_kind'],
): ReviewFeedItem | null {
  const profile = Array.isArray(record.user) ? record.user[0] : record.user
  if (!profile) return null

  return {
    id: record.id,
    rating: record.rating ?? null,
    review: record.review as string,
    review_en: record.review_en ?? null,
    is_spoiler: record.is_spoiler,
    updated_at: record.updated_at,
    source_url: record.source_url,
    user: {
      id: profile.id,
      nickname: profile.nickname,
      nickname_en: profile.nickname_en ?? null,
      avatar_url: profile.avatar_url,
      subject_kind: subjectKind,
      profession: (profile as ReviewProfileRow).profession ?? null,
      title: (profile as ReviewProfileRow).title ?? null,
      title_en: (profile as ReviewProfileRow).title_en ?? null,
      headline: (profile as ReviewProfileRow).headline ?? null,
      headline_en: (profile as ReviewProfileRow).headline_en ?? null,
      slug: (profile as ReviewProfileRow).slug ?? null,
    },
  }
}

async function fetchReviewFeed(
  contentId: string,
  limit: number,
  offset: number,
  excludeUserId: string | null,
  currentUserId: string | null,
  locale: string,
): Promise<ReviewFeedItem[]> {
  const supabase = createStaticClient()

  // 영어 감상문은 en 화면에서만 쓰인다 — ko 응답에서 수신 제외 (egress 절감)
  const reviewEnSelect = locale === 'en' ? 'review_en,' : ''

  const selectBase = `
      id,
      review,
      ${reviewEnSelect}
      is_spoiler,
      updated_at,
      source_url
    `

  let memberQuery = supabase
    .from('member_contents')
    .select(`
      ${selectBase},
      rating,
      member_id
    `)
    .eq('content_id', contentId)
    .eq('visibility', 'public')
    .not('review', 'is', null)
    .order('updated_at', { ascending: false })

  let celebQuery = supabase
    .from('celeb_contents')
    .select(`
      ${selectBase},
      user:celebs!celeb_contents_celeb_id_fkey(id, nickname, nickname_en, avatar_url, profession, title, title_en, headline, headline_en, slug)
    `)
    .eq('content_id', contentId)
    .eq('visibility', 'public')
    .not('review', 'is', null)
    .order('updated_at', { ascending: false })

  if (currentUserId) memberQuery = memberQuery.neq('member_id', currentUserId)

  if (excludeUserId) {
    memberQuery = memberQuery.neq('member_id', excludeUserId)
    celebQuery = celebQuery.neq('celeb_id', excludeUserId)
  }

  // UNION 뷰에 권한을 주지 않고 두 원본을 병렬 조회한 뒤 최신순으로 합친다.
  const fetchLimit = offset + (limit || 20)
  memberQuery = memberQuery.limit(fetchLimit)
  celebQuery = celebQuery.limit(fetchLimit)

  const [memberResult, celebResult] = await Promise.all([memberQuery, celebQuery])
  throwOnQueryError('회원 리뷰 피드 조회', memberResult.error)
  throwOnQueryError('인물 리뷰 피드 조회', celebResult.error)

  const memberRows = (memberResult.data || []) as unknown as MemberReviewFeedRow[]
  const memberIds = [...new Set(memberRows.map((record) => record.member_id))]
  const { data: memberProfiles, error: memberProfilesError } = memberIds.length
    ? await supabase
        .from('member_profiles')
        .select('id, nickname, avatar_url')
        .in('id', memberIds)
    : { data: [], error: null }
  throwOnQueryError('회원 리뷰 작성자 조회', memberProfilesError)

  const memberProfileMap = new Map(
    (memberProfiles ?? []).map((profile) => [profile.id, profile as ReviewProfileRow]),
  )
  const memberItems = memberRows
    .map((record) => {
      const profile = memberProfileMap.get(record.member_id)
      return profile ? toReviewFeedItem({ ...record, user: profile }, 'member') : null
    })
    .filter((item): item is ReviewFeedItem => item !== null)
  const celebItems = ((celebResult.data || []) as unknown as ReviewFeedRow[])
    .map((record) => toReviewFeedItem(record, 'celeb'))
    .filter((item): item is ReviewFeedItem => item !== null)

  return [...memberItems, ...celebItems]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(offset, offset + (limit || 20))
}

const getReviewFeedCached = unstable_cache(
  fetchReviewFeed,
  ['review-feed'],
  // member_contents·celeb_contents와 각 표시 원본 조인
  { revalidate: 3600, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

/**
 * 공개 작품 상세가 셀럽 리뷰 작성자 정보에 의존한다는 사실만 Data Cache에 기록한다.
 *
 * 실제 리뷰는 아래에서 직접 읽는다. 여기에 1시간짜리 결과 캐시를 다시 끼우면 그 짧은
 * 수명이 작품 상세 Full Route 전체의 재생성 주기가 되기 때문이다. 값 없는 영구 캐시는
 * 시간 만료를 만들지 않으면서 `celebs:__all__` 무효화를 작품 상세까지 전파한다.
 */
const trackPublicReviewCelebBulkDependency = unstable_cache(
  async () => true,
  ['public-review-feed-celeb-bulk-dependency-v1'],
  { revalidate: false, tags: [bulkTag(CACHE_TAGS.CELEBS)] },
)

// 콘텐츠 상세의 ISR 본문용. viewer별 제외 규칙을 섞지 않아 모든 방문자가
// 같은 공개 리뷰 HTML을 CDN에서 공유할 수 있다.
export async function getPublicReviewFeed(
  params: GetReviewFeedParams,
  locale: string,
): Promise<ReviewFeedItem[]> {
  const dependencyPromise = trackPublicReviewCelebBulkDependency()

  // 바깥의 콘텐츠 ISR 문서가 결과를 보관한다. 1시간 Data Cache를 중첩하면
  // 페이지 전체의 재검증 주기가 짧아질 수 있으므로 공개 첫 화면은 직접 읽는다.
  // 캐시를 거치지 않아도 폴백은 필요하다 — 조회가 실패했다고 화면 전체를 죽이지 않는다.
  const reviewsPromise = withQueryFallback(
    'getPublicReviewFeed',
    () => fetchReviewFeed(
      params.contentId,
      params.limit ?? 20,
      params.offset ?? 0,
      params.excludeUserId ?? null,
      null,
      locale,
    ),
    [],
  )
  const [reviews] = await Promise.all([reviewsPromise, dependencyPromise])
  return reviews
}

export async function getReviewFeed(params: GetReviewFeedParams): Promise<ReviewFeedItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()

  return withQueryFallback(
    'getReviewFeed',
    () => getReviewFeedCached(
      params.contentId,
      params.limit ?? 20,
      params.offset ?? 0,
      params.excludeUserId ?? null,
      user?.id ?? null,
      locale,
    ),
    [],
  )
}
