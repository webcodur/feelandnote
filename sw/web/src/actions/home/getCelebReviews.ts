'use server'

import { unstable_cache } from 'next/cache'
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
  review_en: string | null
  is_spoiler: boolean | null
  source_url: string | null
  updated_at: string
  content_id: string
  content: ReviewContentRow | ReviewContentRow[] | null
  celeb: ReviewCelebRow | ReviewCelebRow[] | null
}

async function fetchCelebReviews(celebId: string, locale: string): Promise<CelebReview[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('user_contents')
    .select(`
      id,
      rating,
      review,
      review_en,
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
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('셀럽 리뷰 조회 에러:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  const rows = data as ReviewRow[]
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

  return reviews
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

const getCelebReviewsCached = unstable_cache(
  fetchCelebReviews,
  ['celeb-reviews'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getCelebReviews(celebId: string): Promise<CelebReview[]> {
  const locale = await getLocale()
  return getCelebReviewsCached(celebId, locale)
}
