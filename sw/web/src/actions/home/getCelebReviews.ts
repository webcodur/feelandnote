'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebReview } from '@/types/home'
import type { ContentType } from '@/types/database'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getCelebReviews(celebId: string): Promise<CelebReview[]> {
  const supabase = await createClient()

  // 해당 셀럽의 리뷰 조회
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
        id, title, creator, thumbnail_url, type, user_count,
        content_locales(${CL_SELECT})
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

  // 인원 구성 배치 조회 (셀럽 + 일반인)
  const contentIds = [...new Set(data.map(row => row.content_id))]
  const contentCounts = await getContentCountsForContents(supabase, contentIds)

  const reviews: CelebReview[] = data
    .filter(row => row.content && row.celeb && row.review)
    .map(row => {
      const content = Array.isArray(row.content) ? row.content[0] : row.content
      const celeb = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb

      const flat = flattenLocales((content as any).content_locales as ContentLocaleRow[] | null)
      return {
        id: row.id,
        rating: row.rating,
        review: row.review as string,
        review_en: (row as any).review_en ?? null,
        is_spoiler: row.is_spoiler ?? false,
        source_url: row.source_url ?? null,
        updated_at: row.updated_at,
        content: {
          id: content.id,
          title: flat.title || content.title,
          creator: flat.creator || content.creator,
          thumbnail_url: flat.thumbnail_url || content.thumbnail_url,
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

// 콘텐츠별 셀럽/일반인 수 집계 (RPC 단일 호출)
async function getContentCountsForContents(
  supabase: SupabaseClient,
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
