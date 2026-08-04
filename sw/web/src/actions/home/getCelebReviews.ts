'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import type { CelebReview } from '@/types/home'
import type { ContentType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

type StaticSupabase = ReturnType<typeof createStaticClient>

// contents 조인 select 결과 행
interface ReviewContentRow {
  id: string
  type: string
  user_count: number | null
  content_locales: ContentLocaleRow[] | null
}

// profiles 조인 select 결과 행
interface ReviewCelebRow {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  is_verified: boolean | null
  claimed_by: string | null
}

// user_contents select 결과 행
interface ReviewRow {
  id: string
  rating: number | null
  review: string | null
  review_en?: string | null
  is_spoiler: boolean | null
  source_url: string | null
  updated_at: string
  content_id: string
  content: ReviewContentRow | ReviewContentRow[] | null
  celeb: ReviewCelebRow | ReviewCelebRow[] | null
}

interface CelebModalContent {
  reviews: CelebReview[]
  personGuide: string | null
}

const REPRESENTATIVE_REVIEW_LIMIT = 2

async function fetchCelebModalContent(celebId: string, locale: string): Promise<CelebModalContent> {
  const supabase = createStaticClient()

  // 영어 감상문은 en 화면에서만 쓰인다 — ko 응답에서 수신 제외 (egress 절감)
  const reviewEnSelect = locale === 'en' ? 'review_en,' : ''

  const [reviewsResult, explanationResult] = await Promise.all([
    supabase
      .from('user_contents')
      .select(`
        id,
        rating,
        review,
        ${reviewEnSelect}
        is_spoiler,
        source_url,
        updated_at,
        content_id,
        content:contents!user_contents_content_id_fkey(
          id, type, user_count,
          content_locales(${CL_SELECT_LIST})
        ),
        celeb:profiles!user_contents_user_id_fkey(
          id,
          slug,
          nickname,
          avatar_url,
          profession,
          is_verified,
          claimed_by
        )
      `)
      .eq('user_id', celebId)
      .not('review', 'is', null)
      .neq('review', '')
      .eq('visibility', 'public')
      .order('is_pinned', { ascending: false, nullsFirst: false })
      .order('is_recommended', { ascending: false, nullsFirst: false })
      .order('rating', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(REPRESENTATIVE_REVIEW_LIMIT),
    supabase
      .from('celeb_explanations')
      .select('plain_text, plain_text_en')
      .eq('profile_id', celebId)
      .maybeSingle(),
  ])

  const { data, error } = reviewsResult
  if (explanationResult.error) {
    console.error('인물 안내 조회 에러:', explanationResult.error)
  }

  if (error) {
    console.error('셀럽 리뷰 조회 에러:', error)
    return {
      reviews: [],
      personGuide: resolvePersonGuide(explanationResult.data, locale),
    }
  }

  if (!data || data.length === 0) {
    return {
      reviews: [],
      personGuide: resolvePersonGuide(explanationResult.data, locale),
    }
  }

  const rows = data as unknown as ReviewRow[]
  const contentIds = [...new Set(rows.map(row => row.content_id))]
  const contentCounts = await getContentCountsForContents(supabase, contentIds)

  const reviews: CelebReview[] = rows
    .filter((row): row is ReviewRow & { content: ReviewContentRow | ReviewContentRow[]; celeb: ReviewCelebRow | ReviewCelebRow[]; review: string } =>
      Boolean(row.content && row.celeb && row.review))
    .map(row => {
      const content = Array.isArray(row.content) ? row.content[0] : row.content
      const celeb = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb

      const flat = flattenLocales(content.content_locales, locale)
      return {
        id: row.id,
        rating: row.rating,
        review: row.review,
        review_en: row.review_en ?? null,
        is_spoiler: row.is_spoiler ?? false,
        source_url: row.source_url ?? null,
        updated_at: row.updated_at,
        content: {
          id: content.id,
          title: flat.title,
          creator: flat.creator,
          thumbnail_url: flat.thumbnail_url,
          type: content.type as ContentType,
          celeb_count: contentCounts[content.id]?.celebCount ?? 0,
          user_count: contentCounts[content.id]?.userCount ?? 0,
          title_ko: flat.title_ko,
          title_en: flat.title_en,
          creator_en: flat.creator_en,
          isbn_en: flat.isbn_en,
          thumbnail_en: flat.thumbnail_en,
          has_en_edition: flat.has_en_edition,
        },
        celeb: {
          id: celeb.id,
          slug: celeb.slug ?? null,
          nickname: celeb.nickname || '',
          avatar_url: celeb.avatar_url,
          profession: celeb.profession ?? null,
          is_verified: celeb.is_verified ?? false,
          is_platform_managed: celeb.claimed_by === null,
        },
      }
    })

  return {
    reviews,
    personGuide: resolvePersonGuide(explanationResult.data, locale),
  }
}

function resolvePersonGuide(
  explanation: { plain_text: string; plain_text_en: string | null } | null,
  locale: string,
): string | null {
  if (!explanation) return null
  return locale === 'en'
    ? explanation.plain_text_en || explanation.plain_text
    : explanation.plain_text
}

interface ContentCounts {
  celebCount: number
  userCount: number
}

async function getContentCountsForContents(
  supabase: StaticSupabase,
  contentIds: string[]
): Promise<Record<string, ContentCounts>> {
  if (!contentIds.length) return {}

  const { data, error } = await supabase.rpc('get_content_celeb_user_counts', {
    p_content_ids: contentIds,
  })

  if (error || !data) return {}

  const counts: Record<string, ContentCounts> = {}
  for (const row of data as { content_id: string; celeb_count: number; user_count: number }[]) {
    counts[row.content_id] = {
      celebCount: row.celeb_count,
      userCount: row.user_count,
    }
  }
  return counts
}

const getCelebModalContentCached = unstable_cache(
  fetchCelebModalContent,
  ['celeb-modal-content-v2'],
  // 셀럽 감상문(user_contents)·콘텐츠 메타(contents·content_locales) + 공개 인물 안내(celeb_explanations)
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS] }
)

export async function getCelebModalContent(celebId: string): Promise<CelebModalContent> {
  const locale = await getLocale()
  return getCelebModalContentCached(celebId, locale)
}
